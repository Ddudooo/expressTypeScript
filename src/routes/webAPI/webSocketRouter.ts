import express, { Request, Response, NextFunction } from "express";
import logger from "../../config/winston";

const router = express.Router();

router.get("/socket", (req: Request, res: Response) => {
    logger.debug("SOCKET TEST ROUTER");
    res.render("test/socketTest", (err: any, html: string) => {
        if (err) {
            logger.error(err);
            res.status(500).end();
        } else {
            res.status(200).send(html);
        }
    });
});

export default router;
