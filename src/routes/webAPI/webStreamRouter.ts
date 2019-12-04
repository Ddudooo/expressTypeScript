import express, { Request, Response, NextFunction } from "express";

const router = express.Router();

router.get("/stream", (req: Request, res: Response) => {
    res.render("webapi/videoTest");
});

export default router;
