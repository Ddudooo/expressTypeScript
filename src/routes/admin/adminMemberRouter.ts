import express, { Request, Response, NextFunction } from "express";
import moment from "moment";
import { Member, Token, LoginLog } from "../../models/member";
import createHttpError from "http-errors";
import path from "path";
import fx from "../../utils/iteratorUtils";
import { ChatLog } from "../../models/websocket";

import logger from "../../config/winston";

const addStr = (a: any, b: any) => a + "" + b;

const router = express.Router();

// /admin router
router.get("/menu/member/list", (req: Request, res: Response) => {
    //default menu member
    Member.findAndCountAll({
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(userList => {
            res.render("admin/menu/member/memberList", {
                userList: userList.rows,
                max: userList.count,
                page: Number(req.body["page"]) || 1,
                offset: req.body["offset"] - 1 || 0,
                limit: req.body["limit"] || 10,
                orderBy: req.body["orderBy"] || "idx",
                order: req.body["order"] || "DESC",
                moment: moment,
                fx: fx
            });
            return;
        })
        .catch(err => {
            logger.warn(err);
            createHttpError(500);
        });
});

router.all("/menu/member/token/list", (req: Request, res: Response) => {
    Token.findAndCountAll({
        include: [
            {
                model: Member,
                attributes: ["userId"],
                required: false
            }
        ],
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(tokenList => {
            res.render(
                "admin/menu/member/tokenList",
                {
                    tokenList: tokenList.rows,
                    max: tokenList.count,
                    page: Number(req.body["page"]) || 1,
                    offset: req.body["offset"] - 1 || 0,
                    limit: req.body["limit"] || 10,
                    orderBy: req.body["orderBy"] || "idx",
                    order: req.body["order"] || "DESC",
                    moment: moment
                },
                (err, html) => {
                    if (err) logger.debug(err);
                    res.send(html);
                }
            );
        })
        .catch(err => {
            logger.warn(err);
            throw err;
        });
});

router.all("/menu/member/log/login", (req: Request, res: Response) => {
    LoginLog.findAndCountAll({
        include: [
            {
                model: Member,
                attributes: ["userId"],
                required: false
            },
            {
                model: Token,
                attributes: ["expired", "block"],
                required: false
            }
        ],
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(logList => {
            res.render(
                "admin/menu/member/loginLogList",
                {
                    logList: logList.rows,
                    max: logList.count,
                    page: Number(req.body["page"]) || 1,
                    offset: req.body["offset"] - 1 || 0,
                    limit: req.body["limit"] || 10,
                    orderBy: req.body["orderBy"] || "idx",
                    order: req.body["order"] || "DESC",
                    moment: moment
                },
                (err, html) => {
                    if (err) logger.debug(err);
                    res.send(html);
                }
            );
        })
        .catch(err => {
            logger.warn(err);
            throw err;
        });
});

router.all("/menu/member/log/chat", (req: Request, res: Response) => {
    ChatLog.findAndCountAll({
        include: [
            {
                model: Member,
                attributes: ["userId", "nickName"],
                required: false
            }
        ],
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(logList => {
            res.render(
                "admin/menu/member/chatLogList",
                {
                    logList: logList.rows,
                    max: logList.count,
                    page: Number(req.body["page"]) || 1,
                    offset: req.body["offset"] - 1 || 0,
                    limit: req.body["limit"] || 10,
                    orderBy: req.body["orderBy"] || "idx",
                    order: req.body["order"] || "DESC",
                    moment: moment
                },
                (err, html) => {
                    if (err) logger.debug(err);
                    res.send(html);
                }
            );
        })
        .catch(err => {
            logger.warn(err);
            throw err;
        });
});

router.all("/menu/member/log/chat/preview", (req: Request, res: Response) => {
    ChatLog.findOne({
        include: [
            {
                model: Member,
                attributes: ["userId", "nickName"],
                required: false
            }
        ],
        where: {
            idx: req.body["previewIdx"]
        }
    })
        .then(chatLog => {
            if (chatLog !== null) {
                return res.status(200).send(chatLog);
            } else {
                return res.status(404);
            }
        })
        .catch(err => {
            logger.warn(err);
            return res.status(500).send(err);
        });
});

export default router;
