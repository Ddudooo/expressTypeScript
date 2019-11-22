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
const websocket = io(server);

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
const socketAttr = new Map();
websocket.on("connection", (socket: Socket) => {
    console.log("Client connect..." + socket.id);
    console.log(`new connection ${socket.id}`);
    socketAttr.set(socket.id, { name: socket.id, room: "" });
    socket.join("");
    websocket.clients((error: any, clients: any) => {
        if (error) {
            console.error(error);
        }
        console.log(`Connections ${clients}`);
    });
    socket.emit("news", { new: socket.id });
    socket.on("my other event", (data: any): void => {
        console.log(socket.id);
        console.log(data);
    });
    socket.on("change name", (data: any): void => {
        if (data.id.trim().length > 0) {
            let oldAttr = socketAttr.get(socket.id);
            let oldName = oldAttr.name;
            let newAttr = oldAttr;
            newAttr.name = data.id;
            socketAttr.set(socket.id, newAttr);
            console.log(
                "CHANGE NAME %s -> %s",
                socket.id,
                socketAttr.get(socket.id)
            );
            socket.emit("send msg", {
                sender: oldName,
                msg: "Change name" + newAttr.name
            });
        } else {
            socket.emit("send msg", {
                sender: socketAttr.get(socket.id).name,
                msg: "Fail to Change name!"
            });
        }
    });

    socket.on("join Room", (data: any): void => {
        if (data.room.trim().length > 0) {
            let joinRoom = data.room.trim();
            let oldAttr = socketAttr.get(socket.id);
            let oldRoom = oldAttr.room;
            let newAttr = oldAttr;
            newAttr.room = joinRoom;
            console.log(
                "%s change room %s -> %s",
                socket.id,
                oldRoom,
                newAttr.room
            );
            socket.join(joinRoom);
            if (oldAttr.room.trim().length > 0) {
                websocket.to(oldAttr.room.trim()).emit("send msg", {
                    sender: oldAttr.name,
                    msg: "Leave room..."
                });
            } else {
                websocket.emit("send msg", {
                    sender: oldAttr.name,
                    msg: "Leave room..."
                });
            }
            socketAttr.set(socket.id, newAttr);
        } else {
            let oldAttr = socketAttr.get(socket.id);
            console.log("%s change room %s -> %s", socket.id, oldAttr.room, "");
            socket.join("");

            websocket.to(oldAttr.room).emit("send msg", {
                sender: oldAttr.name,
                msg: "Leave room..."
            });
            oldAttr.room = "";
            socketAttr.set(socket.id, oldAttr);
        }
    });
    socket.on("send msg", (data: any): void => {
        console.log(data);
        console.log(socketAttr.get(socket.id));
        websocket.to(socketAttr.get(socket.id).room).emit("send msg", {
            sender: socketAttr.get(socket.id).name,
            msg: data.msg
        });
        // client.write(data.sender + " > " + data.msg);
    });

    socket.on("disconnect", (reason: any): void => {
        socketAttr.delete(socket.id);
        console.log(`${socket.id} disconnect...\nreson > ${reason}`);
    });
    socket.on("error", (err: any): void => {
        console.error(err);
    });
});
