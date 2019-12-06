#!/usr/bin/env node
"use strict";
import dotenv from "dotenv";
import path from "path";
if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
}
//module dependencies.
import app from "../app";
import { sequelize } from "../sequelize";
const debug = require("debug")("express:server");
import nms from "../rtmpServer";
import io, { Socket } from "socket.io";
import { connection } from "../webSocket";
import { chkTokenMiddleware, setNickNameMiddleware } from "../socket";
import http from "http";

const port = normalizePort(process.env.EXPRESS_PORT || 5000);

app.set("port", port);

const server = http.createServer(app);
export const websocket = io(server);

server.listen(port);

server.on("error", onError);

server.on("listen", onListening);

sequelize.sync();
//websocket
websocket.use((socket, next) => chkTokenMiddleware(socket, next));
websocket.use((socket, next) => setNickNameMiddleware(socket, next));
websocket.on("connection", socket => connection(socket));

//node-media-server
nms.run();

function normalizePort(val: string | number) {
    var port = parseInt(String(val), 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: any) {
    if (error.syscall !== "listen") {
        throw error;
    }

    var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    if (addr != null) {
        const bind =
            typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
        debug("Listening on " + bind);
    }
}
