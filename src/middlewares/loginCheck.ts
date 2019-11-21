import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { verifyJWT, refreshToken } from "../utils/tokenUtils";
import { Token } from "../models/member";
import { sequelize } from "../sequelize";
import { Transaction } from "sequelize/types";

/**
 * 유저 토큰 확인 미들 웨어
 */

export function loginCheck(req: Request, res: Response, next: NextFunction) {
    let access: string =
        req.cookies["test.sign"] || req.headers["authorization"];
    let refresh: string =
        req.cookies["test.refresh"] || req.headers["authorization"];
    if (refreshToken === undefined) {
        next(createError(401));
    }
    try {
        verifyJWT(access);
        next();
    } catch (e) {
        sequelize
            .transaction((t: Transaction) => {
                verifyJWT(refresh);
                return refreshToken(refresh, t)
                    .then(() => {
                        return Token.findAll({
                            where: {
                                token: refresh,
                                block: 0
                            },
                            order: [["idx", "DESC"]],
                            limit: 1,
                            transaction: t
                        });
                    })
                    .then(result => {
                        if (result.length > 0) {
                            return Token.findAll({
                                where: {
                                    memberIdx: result[0].memberIdx,
                                    tokenType: 1,
                                    block: 0
                                },
                                order: [["idx", "DESC"]],
                                limit: 1,
                                transaction: t
                            }).then(result => {
                                if (result.length > 0) {
                                    res.cookie("test.sign", result[0].token, {
                                        expires: result[0].expired
                                    });
                                } else {
                                    throw new Error("NOT FOUND TOKEN");
                                }
                            });
                        } else {
                            throw new Error("NOT FOUND TOKEN");
                        }
                    });
            })
            .then(result => {
                res.redirect(req.originalUrl);
            })
            .catch(err => {
                console.log("FAIL TO REFRESH");
                console.error(err);
                console.error(e);
                next(createError(401));
            });
    }
}

export function isLoginRedirect(
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.log("IS LOGIN?");
    let loginCheck = req.cookies["test.sign"];
    if (loginCheck !== undefined) {
        //login check...
        res.redirect("/member/info");
    }
    console.log("NO");
    next();
}

function loginTokenValid(token: string): boolean {
    return false;
}
