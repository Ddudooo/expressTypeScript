import express, { Request, Response, NextFunction } from "express";
import {
    Admin,
    AdminToken,
    AdminLoginLog,
    AdminActionLog
} from "../../models/admin";
import moment from "moment";

import logger from "../../config/winston";

const router = express.Router();

router.all("/menu/admin/list", (req: Request, res: Response) => {
    /**
     * admin list
     */
    Admin.findAndCountAll({
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(result => {
            res.render(
                "admin/menu/admin/adminList",
                {
                    adminList: result.rows,
                    max: result.count,
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
            return;
        })
        .catch((err: any) => {
            logger.warn(err);
            res.status(500).redirect("/");
        });
});
router.all("/menu/admin/token/list", (req: Request, res: Response) => {
    /**
     * admin menu token log list
     */
    AdminToken.findAndCountAll({
        include: [
            {
                model: Admin,
                attributes: ["adminName"],
                required: false
            }
        ],
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(result => {
            res.render("admin/menu/admin/adminTokenList", {
                adminTokenList: result.rows,
                max: result.count,
                page: Number(req.body["page"]) || 1,
                offset: req.body["offset"] - 1 || 0,
                limit: req.body["limit"] || 10,
                orderBy: req.body["orderBy"] || "idx",
                order: req.body["order"] || "DESC",
                moment: moment
            });
            return;
        })
        .catch((err: any) => {
            logger.warn(err);
            res.status(500).redirect("/");
        });
});
router.all("/menu/admin/log/login", (req: Request, res: Response) => {
    /**
     * admin menu login log
     */
    AdminLoginLog.findAndCountAll({
        include: [
            {
                model: Admin,
                attributes: ["adminName"],
                required: false
            },
            {
                model: AdminToken,
                attributes: ["expired", "block"],
                required: false
            }
        ],
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(result => {
            res.render(
                "admin/menu/admin/loginLogList",
                {
                    logList: result.rows,
                    max: result.count,
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
router.all("/menu/admin/log/action", (req: Request, res: Response) => {
    /**
     * admin menu action log
     */
    AdminActionLog.findAndCountAll({
        include: [
            {
                model: Admin,
                attributes: ["adminName"],
                required: false
            },
            {
                model: AdminToken,
                attributes: ["expired", "block"],
                required: false
            }
        ],
        where: {},
        offset: (req.body["offset"] - 1 || 0) * (req.body["limit"] || 10),
        limit: Number(req.body["limit"]) || 10,
        order: [[req.body["orderBy"] || "idx", req.body["order"] || "DESC"]]
    })
        .then(result => {
            res.render(
                "admin/menu/admin/adminActionLogList",
                {
                    logList: result.rows,
                    max: result.count,
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

export default router;
