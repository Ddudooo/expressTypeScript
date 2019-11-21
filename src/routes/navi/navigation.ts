import express, { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { loginCheck } from "../../middlewares";

const router = express.Router();
/**
 * routing root "/nav"
 * kakao javascript key - e0e290d02c818c640b00c589ee17209a
 */
const kakaoJSAPI = "e0e290d02c818c640b00c589ee17209a";

router.get("/", loginCheck, (req: Request, res: Response) => {
    res.render("navi/test_navi", { key: kakaoJSAPI });
});

export default router;
