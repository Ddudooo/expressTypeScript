//express
import express, { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import path from "path";
import session, * as expressSession from "express-session";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
//logger
import logger from "./config/winston";
import morgan from "morgan";
//routers
import indexRouter from "./routes/indexRouter";
import {
    webAPITestRouter,
    webSocketRouter,
    webStreamRouter
} from "./routes/webAPI";
import { naviRouter } from "./routes/navi";
import {
    adminMemberRouter,
    adminLoginRouter,
    adminAdminRouter
} from "./routes/admin";
//lib

import nodeRSA from "node-rsa";
import fs from "fs";

//custom modules
import { searchLocaleCode } from "./utils/translateUtils";
import { adminLoginCheck } from "./middlewares/adminCheck";
import { loginCheck } from "./middlewares";

// RSA-512 KEY CHECK
if (
    !fs.existsSync(path.join(__dirname, "config", "ServerPublicKey.pem")) &&
    !fs.existsSync(path.join(__dirname, "config", "ServerPrivateKey.pem"))
) {
    const key: nodeRSA = new nodeRSA({ b: 512 });
    key.generateKeyPair();
    let publicKey: string = key.exportKey("pkcs1-public");
    let privateKey: string = key.exportKey("pkcs1-private");
    try {
        fs.writeFileSync(
            path.join(__dirname, "config", "ServerPublicKey.pem"),
            publicKey,
            { encoding: "utf8", flag: "wx" }
        );
        fs.writeFileSync(
            path.join(__dirname, "config", "ServerPrivateKey.pem"),
            privateKey,
            { encoding: "utf8", flag: "wx" }
        );
    } catch (e) {
        logger.error(e);
    }
}

const app = express();

//Express view engine setting
app.set("views", path.join(__dirname, "/views"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

//Logger middle ware
app.use(
    morgan(process.env.NODE_ENV === "development" ? "dev" : "tiny", {
        stream: logger.stream
    })
);

//Body parser, Cookie parser middleware
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);
app.use(cookieParser());

//express session setting
app.use(
    session({
        secret: "secret",
        resave: false,
        saveUninitialized: true
    })
);

//Local setting middle ware
app.use((req: Request, res: Response, next: NextFunction) => {
    //locale setting middle ware
    try {
        if (searchLocaleCode(String(req.query["lang"])) !== "auto") {
            res.setHeader("Content-language", String(req.query["lang"]));
        }
    } catch (err) {
        logger.error(err);
        logger.warn("FAIL TO LOCAL MIDDLEWARE");
    }
    next();
});
//routing
app.use("", indexRouter);

app.use("/navi", naviRouter);
app.use("/webapi", webAPITestRouter);
app.use("/webapi", webStreamRouter);
app.use("/webapi", loginCheck, webSocketRouter);

//admin routing
app.use("/admin", adminLoginRouter);
app.use("/admin", adminLoginCheck, adminMemberRouter);
app.use("/admin", adminLoginCheck, adminAdminRouter);

app.use(express.static(path.join(__dirname, "public")));

//handing errores
app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.session = req.session;
    next();
});

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
    next(createError(404));
});

// error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.status === 401) {
        res.locals.message = err.message;
        res.locals.error = req.app.get("env") === "development" ? err : {};

        //return res.render("unAuthorized");
        res.setHeader("referer", req.url);
        logger.warn(req.ip + " ERROR HANDLED UNAUTHORIZED");
        res.status(401);
        if (req.url.indexOf("admin") >= 0) {
            return res.render("admin/signin");
        } else {
            return res.render("member/signin");
        }
    }
    next(err);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

// server.listen(PORT, HOST, () => {
//     logger.info(
//         `EXPRESS SERVER START\nSERVER LISTENING PORT ${PORT}\nSERVER LISTENING HOST ${HOST}`
//     );
// });

export default app;
