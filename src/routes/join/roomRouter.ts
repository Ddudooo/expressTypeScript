import express, { Request, Response, NextFunction } from "express";
const router = express.Router();

/**
 * websocket 활용 라우팅 예정...
 * 기능이 없음.
 */
//join
router.get("/:channel", (req: Request, res: Response) => {});

export default router;
