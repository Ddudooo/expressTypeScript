import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { sequelize } from "../sequelize";
import { Transaction } from "sequelize/types";
import { verifyJWT, refreshToken } from "../utils/tokenUtils";
import { AdminToken, Admin, AdminActionLog } from "../models/admin";

import logger from "../config/winston";
/**
 * 어드민 토큰 확인 미들 웨어
 */

export function adminLoginCheck(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const access =
        req.headers["authorization"] || req.cookies["test.admin.sign"];
    const refresh =
        req.headers["authorization"] || req.cookies["test.admin.refresh"];
    try {
        verifyJWT(access);
        next();
    } catch (e) {
        sequelize
            .transaction((t: Transaction) => {
                verifyJWT(refresh);
                return refreshToken(refresh, t, "admin")
                    .then(() => {
                        return AdminToken.findAll({
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
                            return AdminToken.findAll({
                                where: {
                                    adminIdx: result[0].adminIdx,
                                    tokenType: 1,
                                    block: 0
                                },
                                order: [["idx", "DESC"]],
                                limit: 1,
                                transaction: t
                            });
                        } else {
                            throw new Error("NOT FOUND TOKEN");
                        }
                    })
                    .then(result => {
                        if (result.length > 0) {
                            res.cookie("test.admin.sign", result[0].token, {
                                expires: result[0].expired
                            });
                            return AdminActionLog.create(
                                {
                                    adminIdx: result[0].adminIdx,
                                    ipaddress:
                                        req.headers["x-forwarded-for"] ||
                                        req.connection.remoteAddress,
                                    comment: "REFRESH ACCESS TOKEN",
                                    tokenIdx: result[0].idx
                                },
                                { transaction: t }
                            );
                        } else {
                            throw new Error("NOT FOUND TOKEN");
                        }
                    })
                    .then(result => {
                        return result;
                    });
            })
            .then(result => {
                res.redirect(req.originalUrl);
            })
            .catch(err => {
                logger.warn("FAIL TO REFRESH");
                logger.warn(err);
                res.setHeader("referer", req.originalUrl);
                next(createError(401));
            });
    }
}

export function isLoginRedirect(
    req: Request,
    res: Response,
    next: NextFunction
) {
    logger.info("IS LOGIN?");
    let loginCheck = req.cookies["test.admin.sign"];
    if (loginCheck !== undefined) {
        //login check...
        res.redirect("/");
    }
    logger.info("NO");
    next();
}
