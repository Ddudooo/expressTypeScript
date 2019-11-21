import express, { Request, Response, NextFunction } from "express";
import moment from "moment";
import { Member, Token, LoginLog } from "../../models/member";
import createHttpError from "http-errors";
import path from "path";
import fx from "../../utils/iteratorUtils";

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
            console.error(err);
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
                    if (err) console.error(err);
                    res.send(html);
                }
            );
        })
        .catch(err => {
            console.error(err);
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
                    if (err) console.error(err);
                    res.send(html);
                }
            );
        })
        .catch(err => {
            console.error(err);
            throw err;
        });
});

router.get("/login", (req: Request, res: Response) => {
    res.render("admin/login");
});

router.post("/login", (req: Request, res: Response) => {
    res.redirect(req.headers["referer"] || "/admin/menu/member");
});

export default router;
