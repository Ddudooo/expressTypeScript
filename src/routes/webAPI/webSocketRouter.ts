import express, { Request, Response, NextFunction } from "express";

const router = express.Router();

router.get("/socket", (req: Request, res: Response) => {
    console.log("SOCKET TEST ROUTER");
    res.render("test/socketTest", (err: any, html: string) => {
        if (err) {
            console.error(err);
            res.status(500).end();
        } else {
            res.status(200).send(html);
        }
    });
});

export default router;
