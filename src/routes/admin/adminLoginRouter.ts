import express, { Request, Response, NextFunction } from "express";
import { sequelize } from "../../sequelize";
import { Transaction } from "sequelize/types";
import {
    Admin,
    AdminToken,
    AdminLoginLog,
    AdminActionLog
} from "../../models/admin";
import { payloadJWT, createJWT, disableJWT } from "../../utils/tokenUtils";
import { adminLoginCheck } from "../../middlewares/adminCheck";
import createError from "http-errors";

import logger from "../../config/winston";

const router = express.Router();

router.get("/signin", (req: Request, res: Response) => {
    res.render("admin/signin");
});

router.post("/signin", (req: Request, res: Response) => {
    logger.debug(
        "SIGN IN REQUEST\nIPADDRESS [%s]\nREQUEST URI [%s]",
        req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        req.headers["referer"] || req.url
    );
    let loginAdmin: Admin;
    let access: payloadJWT;
    let refresh: payloadJWT;
    let log: AdminLoginLog = AdminLoginLog.build({
        ipaddress:
            req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        reqURI: req.headers["referer"] || req.url
    });
    sequelize
        .transaction((t: Transaction) =>
            Admin.findAll({
                where: {
                    adminId: req.body["signin-id"]
                },
                limit: 1,
                transaction: t
            })
                .then((result: Admin[]) => {
                    if (result.length > 0) {
                        loginAdmin = result[0];
                        log.set("adminIdx", loginAdmin.idx);
                        if (!loginAdmin.checkPassword(req.body["signin-pw"]))
                            throw new Error("NOT FOUND ADMIN");
                        access = {
                            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 1,
                            data: {
                                idx: loginAdmin.idx,
                                name: loginAdmin.adminName
                            }
                        };
                        refresh = {
                            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
                            data: {
                                idx: loginAdmin.idx,
                                name: loginAdmin.adminName
                            }
                        };
                        return Promise.all([
                            createJWT(access, 0, t, "admin"),
                            createJWT(refresh, 0, t, "admin")
                        ]);
                    } else {
                        throw new Error("NOT FOUND ADMIN");
                    }
                })
                .then(([accessToken, refreshToken]) => {
                    log.set("tokenIdx", refreshToken.idx);
                    res.cookie("test.admin.refresh", refreshToken.token, {
                        expires: new Date(Number(refresh.exp) * 1000)
                    });
                    res.cookie("test.admin.sign", accessToken.token, {
                        expires: new Date(Number(access.exp) * 1000)
                    });
                    return AdminActionLog.create(
                        {
                            adminIdx: loginAdmin.idx,
                            ipaddress: log.ipaddress,
                            comment: "Login success",
                            tokenIdx: refreshToken.idx
                        },
                        { transaction: t }
                    );
                })
                .then(result => result)
        )
        .then(() => {
            log.set("confirm", true);
        })
        .catch(err => {
            logger.warn(err);
            log.set("tokenIdx", null);
            log.set("confirm", false);
            res.clearCookie("test.admin.sign");
            res.clearCookie("test.admin.refresh");
            res.setHeader("referer", req.headers["referer"] || "/");
        })
        .finally(() => {
            log.save();
            res.redirect(req.headers["referer"] || "/");
        });
});

router.all(
    "/logout",
    adminLoginCheck,
    (req: Request, res: Response, next: NextFunction) => {
        let accessToken: string = req.cookies["test.admin.sign"];
        let refreshToken: string = req.cookies["test.admin.refresh"];
        sequelize
            .transaction((t: Transaction) => {
                return Promise.all([
                    disableJWT(accessToken, t, "admin"),
                    disableJWT(refreshToken, t, "admin")
                ])
                    .then(([access, refresh]) => {
                        if (access.length > 0 && refresh.length > 0) {
                            return new Promise((resolve, reject) => {
                                AdminToken.findAll({
                                    where: {
                                        token: refreshToken
                                    },
                                    limit: 1,
                                    order: [["idx", "DESC"]],
                                    transaction: t
                                })
                                    .then(result => {
                                        return AdminActionLog.create(
                                            {
                                                adminIdx: result[0].adminIdx,
                                                ipaddress:
                                                    req.headers[
                                                        "x-forwarded-for"
                                                    ] ||
                                                    req.connection
                                                        .remoteAddress,
                                                comment: "LOGOUT",
                                                tokenIdx: result[0].idx
                                            },
                                            { transaction: t }
                                        );
                                    })
                                    .then(result => {
                                        return resolve(result);
                                    })
                                    .catch(err => {
                                        return reject(err);
                                    });
                            });
                        } else {
                            throw new Error("NOT FOUND TOKEN DATA");
                        }
                    })
                    .then(result => {
                        return result;
                    });
            })
            .then(result => {
                res.clearCookie("test.admin.sign");
                res.clearCookie("test.admin.refresh");
                res.redirect("/admin/signin");
            })
            .catch(err => {
                logger.warn(err);
                res.setHeader("referer", req.url);
                next(createError(401));
            });
    }
);

export default router;
