//express
import express, { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import path from "path";
import session, * as expressSession from "express-session";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
//routers
import indexRouter from "./routes/indexRouter";
import { webAPITestRouter, webSocketRouter } from "./routes/webAPI";
import { naviRouter } from "./routes/navi";
import {
    adminMemberRouter,
    adminLoginRouter,
    adminAdminRouter
} from "./routes/admin";
//lib
import io, { Socket } from "socket.io";
import {
    chkTokenMiddleware,
    setNickNameMiddleware,
    connection
} from "./webSocket";
import http from "http";
import { sequelize } from "./sequelize";
import nodeRSA from "node-rsa";
import fs from "fs";
import dotenv from "dotenv";
//custom modules
import { searchLocaleCode } from "./utils/translateUtils";
import { adminLoginCheck } from "./middlewares/adminCheck";
import { loginCheck } from "./middlewares";

dotenv.config({ path: path.resolve(__dirname, ".env") });

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
        console.error(e);
    }
}

const app = express();
const server = http.createServer(app);
export const websocket = io(server);

sequelize.sync();

//Express view engine setting
app.set("views", path.join(__dirname, "/views"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

//Logger middle ware
app.use(morgan("dev"));

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
        if (searchLocaleCode(req.query["lang"]) !== "auto") {
            res.setHeader("Content-language", req.query["lang"]);
        }
    } catch (err) {
        console.error(err);
        console.log("FAIL TO LOCAL MIDDLEWARE");
    }
    next();
});
//routing
app.use("", indexRouter);

app.use("/navi", naviRouter);
app.use("/test", webAPITestRouter);
app.use("/test", loginCheck, webSocketRouter);
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
        console.log("ERROR HANDLED UNAUTHORIZED");
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

server.listen(5000, "0.0.0.0", () => {
    console.log(
        "Server Start\nSERVER LISTENING PORT 5000\nSERVER LISTENING HOST 0.0.0.0"
    );
});
//export default app;
// const websocket = io.listen(
//     app.listen(5000, "0.0.0.0", () => {
//         console.log("SERVER START LISTENING PORT 5000");
//     })
// );

// websocket
websocket.use((socket, next) => chkTokenMiddleware(socket, next));
websocket.use((socket, next) => setNickNameMiddleware(socket, next));
websocket.on("connection", socket => connection(socket));
