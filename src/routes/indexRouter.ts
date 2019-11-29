import express, { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { Member, Token, LoginLog } from "../models/member";
import { loginCheck, isLoginRedirect } from "../middlewares/loginCheck";
import {
    payloadJWT,
    createJWT,
    verifyJWT,
    disableJWT
} from "../utils/tokenUtils";
import { translate, searchLocaleCode } from "../utils/translateUtils";
import { sequelize } from "../sequelize";
import { Transaction } from "sequelize/types";
import { LANGUAGE_BY_LOCALE } from "../utils/translateUtils/localeCode";
import { translateText } from "../utils/translateUtils/translateGoogle";

import { Op } from "sequelize";

import logger from "../config/winston";

/**
 * 기본 경로 라우팅
 * 너무 길어져서 분리 예정
 */

const router = express.Router();

router.all("/", (req: Request, res: Response) => {
    if (req.cookies["test.sign"]) {
        logger.debug("TOKEN DETECTED");
        res.status(200).render("index");
    }
    res.status(200).render("index");
});

router.get("/signup", isLoginRedirect, (req: Request, res: Response) => {
    res.render("member/signup");
});

router.post(
    "/signup",
    isLoginRedirect,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await Member.create({
                userId: req.body["signup-id"],
                password: req.body["signup-pw"],
                nickName: req.body["signup-nickName"]
            });
        } catch (e) {
            logger.warn("FAIL TO CREATE USER");
            logger.warn(e);
            next(e);
        }
        res.status(200).redirect("/");
    }
);

router.get("/signin", isLoginRedirect, (req: Request, res: Response) => {
    if (req.headers["referer"]) {
        logger.debug("REQUEST REFERER - " + req.headers["referer"]);
        res.setHeader("referer", req.headers["referer"]);
    }
    logger.debug(req.headers["referer"]);
    logger.debug(res.getHeader("referer"));
    res.render("member/signin");
});

router.post(
    "/signin",
    isLoginRedirect,
    (req: Request, res: Response, next: NextFunction) => {
        logger.debug(
            `SIGN IN REQUEST\n` +
                `IPADDRESS [${req.headers["x-forwarded-for"] ||
                    req.connection.remoteAddress}]\n` +
                `REQUEST URI [${req.headers["referer"] || req.url}]`
        );
        /**
         * 트랜잭션 부분이 프로미스로 구현되어 있음.
         * 콜백을 통한 프로미스 객체 전달로 하나의 트랜잭션 처리
         *
         * 아래 코드는 과정마다 오류 발생시 다음 과정을 넘기고 롤백
         * 로그 기록은 롤백되지 않음
         *      -> 오류 발생 이전에 현재 과정까지 기록후 오류 발생.
         * 1. 입력한 정보로 유저 정보 확인
         *      -   입력된 ID로 검색 없을시 오류
         *      -   로그 내역에 유저 정보 임시 저장
         *      -   조회된 레코드에서 salt값 참조 후 패스워드 연산
         *      -   결과 값으로 다시 패스워드 비교
         * 2. 유저 정보중 idx, nickname 값으로 JWT생성
         *      -   tokenUtils 모듈에서 jwt생성
         *      -   생성된 토큰을 db에 기록하기 위해
         *          프로미스 객체를 반환하는 쿼리 함수 호출
         * 3. 생성된 토큰과 함께 로그인 로그에 기록
         *      -   유저 정보로 가장 최근에 기록된 토큰 읽음
         *      -   해당 토큰 정보와 함께 로그인 성공 기록 입력
         */
        // 요청 정보 로그 기록
        let log: LoginLog = LoginLog.build({
            ipaddress:
                req.headers["x-forwarded-for"] || req.connection.remoteAddress,
            reqURI: req.headers["referer"] || req.url
        });
        let loginUser: Member;
        let access: payloadJWT;
        let refresh: payloadJWT;
        sequelize
            .transaction((t: Transaction) => {
                return Member.findAll({
                    where: {
                        userId: req.body["signin-id"]
                    },
                    limit: 1,
                    transaction: t
                })
                    .then((result: Member[]) => {
                        if (result.length > 0) {
                            loginUser = result[0];
                            log.set("memberIdx", loginUser.idx);
                            if (!loginUser.checkPassword(req.body["signin-pw"]))
                                throw new Error("Member Information Incorrect");
                            // 해당 유저 정보로 로그인 시도 성공
                            // 유저 정보를 토대로 토큰 생성을 위한 페이로드
                            access = {
                                exp:
                                    Math.floor(Date.now() / 1000) + 60 * 60 * 1, // 유효기간 한시간.
                                data: {
                                    name: loginUser.nickName,
                                    idx: loginUser.idx
                                }
                            };
                            refresh = {
                                exp:
                                    Math.floor(Date.now() / 1000) +
                                    60 * 60 * 24, // 유효기간 하루.
                                data: {
                                    name: loginUser.nickName,
                                    idx: loginUser.idx
                                }
                            };

                            // 토큰 생성후 db에 기록
                            return Promise.all([
                                createJWT(access, 1, t),
                                createJWT(refresh, 0, t)
                            ]);
                        } else {
                            // 검색되는 유저 정보 없음
                            throw new Error("Member Information Incorrect");
                        }
                    })
                    .then(([accessToken, refreshToken]) => {
                        // 로그인 완료 로그 기록
                        log.set("tokenIdx", refreshToken.idx);
                        log.set("confirm", true);
                        res.cookie("test.refresh", refreshToken.token, {
                            expires: new Date(Number(refresh.exp) * 1000)
                        });
                        res.cookie("test.sign", accessToken.token, {
                            expires: new Date(Number(access.exp) * 1000)
                        });
                        return;
                    });
            })
            .then((result: any) => {
                //commit
                logger.debug("REFERER > " + req.headers["referer"] || "/");
            })
            .catch((err: any) => {
                logger.warn("FAIL LOGIN");
                logger.warn(err);
                res.setHeader("referer", req.headers["referer"] || "/");
            })
            .finally(() => {
                res.redirect(req.headers["referer"] || "/");
                log.save();
            });
    }
);

router.get(
    "/logout",
    loginCheck,
    (req: Request, res: Response, next: NextFunction) => {
        let accessToken: string = req.cookies["test.sign"];
        let refreshToken: string = req.cookies["test.refresh"];
        sequelize
            .transaction((t: Transaction) => {
                return Promise.all([
                    disableJWT(accessToken, t),
                    disableJWT(refreshToken, t)
                ]).then(([access, refresh]) => {
                    if (access.length > 0 && refresh.length > 0) {
                        return;
                    } else {
                        throw new Error("NOT FOUND TOKEN DATA");
                    }
                });
            })
            .then(result => {
                res.clearCookie("test.sign");
                res.clearCookie("test.refresh");
                res.redirect("/");
            })
            .catch(err => {
                logger.warn(err);
                next(createError(401));
            });
    }
);

router.get(
    "/member/info",
    loginCheck,
    (req: Request, res: Response, next: NextFunction) => {
        /**
         * db 연동후 작업
         */

        Token.findAll({
            where: {
                token: req.cookies["test.sign"],
                block: 0,
                expired: { [Op.gt]: Date.now() }
            },
            order: [["idx", "DESC"]],
            limit: 1
        })
            .then(result => {
                if (result.length > 0) {
                    return Member.findByPk(result[0].memberIdx);
                } else {
                    next(createError(401));
                }
            })
            .then(user => {
                if (user !== null && user !== undefined) {
                    return res.render("member/info", { member: user });
                }
                throw new Error("NOT FOUND USER");
            })
            .catch(err => {
                logger.warn(err);
                res.status(500).redirect("/");
            });
    }
);

router.post(
    "/member/info/modify",
    loginCheck,
    (req: Request, res: Response) => {
        /**
         * db 연동후 작업
         */
    }
);

// TEST
router.get("/tl", loginCheck, (req: Request, res: Response) => {
    //logger.info(LANGUAGE_BY_LOCALE);
    const localMap = new Map(Object.entries(LANGUAGE_BY_LOCALE));
    res.render("translate", { locals: localMap });
});

router.post("/tl", loginCheck, (req: Request, res: Response) => {
    let params: any[] = ["auto", "auto", ""];
    if (res.hasHeader("Content-language")) {
        params[1] = res.getHeader("Content-language");
    } else if (req.body["tl"]) {
        params[1] = searchLocaleCode(req.body["tl"]);
    }
    if (req.body["sl"]) {
        params[0] = req.body["sl"];
    }
    params[2] += req.body["question"];
    translateText(params[0], params[1], params[2])
        .then((t: any) => {
            // logger.info(t);
            try {
                // let result = JSON.parse(t);
                // let output = result[0];
                let output = t.translations;
                let translateQuestion = [];
                for (const t of output) {
                    // translateQuestion.push(t[0]);
                    translateQuestion.push(t.translatedText);
                }
                return res.send(translateQuestion.join("\n"));
            } catch (e) {
                //logger.error(e);
                // logger.info(result);
                throw new Error(e);
            }
        })
        .catch(err => {
            logger.warn(err);
            return res
                .status(500)
                .send(`FAIL TRANSLAGE PARAM ${params.join(" ")}`);
        });
});
// TEST

export default router;
