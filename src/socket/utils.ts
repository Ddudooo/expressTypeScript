import { Socket } from "socket.io";
import { ChatLog } from "../models/websocket";
import { socketAttr } from "../webSocket";
import { websocket } from "../bin/www";
import { Token } from "../models/member";

import logger from "../config/winston";

export const broadcastRoom = (
    socket: Socket,
    msg: string,
    cmd: boolean = false
) => {
    return new Promise((resolve, reject) => {
        try {
            getAccessToken(socket)
                .then(result => {
                    if (result !== null) {
                        return ChatLog.create({
                            memberIdx: result.memberIdx,
                            tokenIdx: result.idx,
                            chat: msg,
                            chatRoom:
                                socketAttr.get(socket.id).room || "default",
                            ipaddress: socket.handshake.address
                        });
                    } else {
                        throw new Error("NOT FOUND TOKEN");
                    }
                })
                .then(() => {
                    if (!cmd) {
                        let t = "";
                        socket.broadcast
                            .to(socketAttr.get(socket.id).room)
                            .emit("send msg", {
                                sender: socketAttr.get(socket.id).name,
                                msg: msg,
                                date: Date.now()
                            });
                    } else {
                        websocket
                            .to(socketAttr.get(socket.id).room)
                            .emit("send msg", {
                                sender: socketAttr.get(socket.id).name,
                                msg: msg,
                                date: Date.now()
                            });
                    }
                    resolve();
                })
                .catch(err => {
                    throw new Error(err);
                });
        } catch (e) {
            logger.error(e);
            reject(e);
        }
    });
};
export const getAccessToken = (socket: Socket) => {
    let token;
    if (socket.request.headers.cookie.indexOf("test.sign") > -1) {
        let cookies = socket.request.headers.cookie;
        token = cookies.slice(
            cookies.indexOf("test.sign"),
            cookies.indexOf(";", cookies.indexOf("test.sign")) > -1
                ? cookies.indexOf(";", cookies.indexOf("test.sign"))
                : cookies.length
        );
        token = token.split("=")[1];
    } else if (socket.request.headers.Authentication !== undefined) {
        token = socket.request.headers.Authentication;
    } else {
        throw new Error("NOT FOUND TOKEN");
    }
    return Token.findOne({
        where: {
            token: token
        },
        order: [["idx", "DESC"]]
    });
};
