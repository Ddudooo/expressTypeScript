import { Socket } from "socket.io";
import { verifyJWT, refreshToken } from "../utils/tokenUtils";
import { sequelize } from "../sequelize";
import { Transaction } from "sequelize/types";
import { Token, Member } from "../models/member";
import { socketAttr } from "../webSocket";

import logger from "../config/winston";

const socketTokenCheck = (socket: Socket, next: any) => {
    if (socket.request.headers.cookie.indexOf("test.sign") > -1) {
        let cookies = socket.request.headers.cookie;
        let token = cookies.slice(
            cookies.indexOf("test.sign"),
            cookies.indexOf(";", cookies.indexOf("test.sign")) > -1
                ? cookies.indexOf(";", cookies.indexOf("test.sign"))
                : cookies.length
        );
        let refresh = cookies.slice(
            cookies.indexOf("test.refresh"),
            cookies.indexOf(";", cookies.indexOf("test.refresh")) > -1
                ? cookies.indexOf(";", cookies.indexOf("test.refresh"))
                : cookies.length
        );
        token = token.split("=")[1];
        refresh = refresh.split("=")[1];
        logger.debug("ACCESS TOKEN " + token);
        logger.debug("REFRESH TOKEN " + refresh);
        try {
            verifyJWT(token);
            logger.debug(socket.id + " ACCESS TOKEN OK");
            return next();
        } catch (e) {
            logger.debug(socket.id + " NOT FOUND ACCESS TOKEN");
            if (cookies.indexOf("test.refresh") > -1) {
                refresh = refresh.split("=")[1];
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
                                            socket.handshake.headers.cookie =
                                                "test.sign=" +
                                                result[0].token +
                                                result[0].expired +
                                                ";";
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
                        return next();
                    })
                    .catch(err => {
                        logger.warn("FAIL TO REFRESH");
                        logger.warn(err);
                        next(new Error("Authentication Error"));
                    });
            } else {
                return next(new Error("Authentication Error"));
            }
        }
    } else if (socket.request.headers.Authentication !== undefined) {
        try {
            verifyJWT(socket.request.headers.Authentication);
            return next();
        } catch (e) {
            logger.error(e);
            return next(new Error("Authentication Error"));
        }
    } else {
        return next(new Error("Authentication Error"));
    }
};
export const chkTokenMiddleware = (socket: Socket, next: any) =>
    socketTokenCheck(socket, next);
export const setNickNameMiddleware = (socket: Socket, next: any) => {
    let token;
    if (socket.request.headers.cookie.indexOf("test.sign") > -1) {
        let cookies = socket.request.headers.cookie;
        token = cookies.slice(
            cookies.indexOf("test.sign"),
            cookies.indexOf(";", cookies.indexOf("test.sign")) > -1
                ? cookies.indexOf(";", cookies.indexOf("test.sign"))
                : cookies.length
        );
        token = token.split("=")[1];
    } else if (socket.request.headers.Authentication !== undefined) {
        token = socket.request.headers.Authentication;
    } else {
        return next(new Error("Authentication Error"));
    }
    Token.findOne({
        include: [
            {
                model: Member,
                attributes: ["nickName"],
                required: false
            }
        ],
        where: {
            token: token
        },
        order: [["idx", "DESC"]]
    })
        .then(result => {
            if (result !== null) {
                socketAttr.set(socket.id, {
                    name: result.member.nickName,
                    room: ""
                });
                return next();
            } else {
                return new Error("Authentication Error");
            }
        })
        .catch(err => {
            logger.warn(err);
            return next(new Error("Authentication Error"));
        });
};
