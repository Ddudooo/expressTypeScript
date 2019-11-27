import { websocket } from "./app";
import io, { Socket } from "socket.io";
import { verifyJWT, refreshToken } from "./utils/tokenUtils";
import { sequelize } from "./sequelize";
import { Transaction } from "sequelize/types";
import { Token, Member } from "./models/member";
import { ChatLog } from "./models/websocket";

//text to speech
import fs from "fs";
import util from "util";
import path from "path";
// import buffer from "buffer";
import * as textToSpeech from "@google-cloud/text-to-speech";
// import { BufferReader } from "protobufjs";
//const textToSpeech = require("@google-cloud/text-to-speech");

const tts = async (text: string) => {
    // Creates a client
    const client = new textToSpeech.TextToSpeechClient();

    // The text to synthesize
    //const text = 'Hello, world!';

    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML Voice Gender (optional)
        voice: { languageCode: "ko-KR", ssmlGender: 3 },
        // Select the type of audio encoding
        audioConfig: { audioEncoding: 2 } //MP3
    };

    // Performs the Text-to-Speech request
    const [response] = await client.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    return response.audioContent;
    const writeFile = util.promisify(fs.writeFile);
    await writeFile("output.mp3", response.audioContent, "binary");
    console.log("Audio content written to file: output.mp3");
};

const socketAttr = new Map();
const broadcastRoom = (socket: Socket, msg: string, cmd: boolean = false) => {
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
                        tts(
                            "sender, " +
                                socketAttr.get(socket.id).name +
                                ", message, " +
                                msg
                        )
                            .then(result => {
                                if (result !== undefined && result !== null) {
                                    socket.broadcast
                                        .to(socketAttr.get(socket.id).room)
                                        .emit("tts", {
                                            sender: socketAttr.get(socket.id)
                                                .name,
                                            audio: Buffer.from(
                                                result.buffer
                                            ).toString("base64"),
                                            date: Date.now()
                                        });
                                }
                            })
                            .catch(e => {
                                throw e;
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
            console.error(e);
            reject(e);
        }
    });
};
const getAccessToken = (socket: Socket) => {
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
const socketTokenCheck = (socket: Socket, next: any) => {
    if (socket.request.headers.cookie.indexOf("test.sign") > -1) {
        let cookies = socket.request.headers.cookie;
        let token = cookies.slice(
            cookies.indexOf("test.sign"),
            cookies.indexOf(";", cookies.indexOf("test.sign")) > -1
                ? cookies.indexOf(";", cookies.indexOf("test.sign"))
                : cookies.length
        );
        let refresh = cookies.slice(
            cookies.indexOf("test.refresh"),
            cookies.indexOf(";", cookies.indexOf("test.refresh")) > -1
                ? cookies.indexOf(";", cookies.indexOf("test.refresh"))
                : cookies.length
        );
        token = token.split("=")[1];
        refresh = refresh.split("=")[1];
        console.log("ACCESS TOKEN " + token);
        console.log("REFRESH TOKEN " + refresh);
        try {
            verifyJWT(token);
            console.log(socket.id + " ACCESS TOKEN OK");
            return next();
        } catch (e) {
            console.log(socket.id + " NOT FOUND ACCESS TOKEN");
            if (cookies.indexOf("test.refresh") > -1) {
                refresh = refresh.split("=")[1];
                sequelize
                    .transaction((t: Transaction) => {
                        verifyJWT(refresh);
                        return refreshToken(refresh, t)
                            .then(() => {
                                return Token.findAll({
                                    where: {
                                        token: refresh,
                                        block: 0
                                    },
                                    order: [["idx", "DESC"]],
                                    limit: 1,
                                    transaction: t
                                });
                            })
                            .then(result => {
                                if (result.length > 0) {
                                    return Token.findAll({
                                        where: {
                                            memberIdx: result[0].memberIdx,
                                            tokenType: 1,
                                            block: 0
                                        },
                                        order: [["idx", "DESC"]],
                                        limit: 1,
                                        transaction: t
                                    }).then(result => {
                                        if (result.length > 0) {
                                            socket.handshake.headers.cookie =
                                                "test.sign=" +
                                                result[0].token +
                                                result[0].expired +
                                                ";";
                                        } else {
                                            throw new Error("NOT FOUND TOKEN");
                                        }
                                    });
                                } else {
                                    throw new Error("NOT FOUND TOKEN");
                                }
                            });
                    })
                    .then(result => {
                        return next();
                    })
                    .catch(err => {
                        console.log("FAIL TO REFRESH");
                        console.error(err);
                        console.error(e);
                        next(new Error("Authentication Error"));
                    });
            } else {
                return next(new Error("Authentication Error"));
            }
        }
    } else if (socket.request.headers.Authentication !== undefined) {
        try {
            verifyJWT(socket.request.headers.Authentication);
            return next();
        } catch (e) {
            console.error(e);
            return next(new Error("Authentication Error"));
        }
    } else {
        return next(new Error("Authentication Error"));
    }
};
export const chkTokenMiddleware = (socket: Socket, next: any) =>
    socketTokenCheck(socket, next);
export const setNickNameMiddleware = (socket: Socket, next: any) => {
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
        return next(new Error("Authentication Error"));
    }
    Token.findOne({
        include: [
            {
                model: Member,
                attributes: ["nickName"],
                required: false
            }
        ],
        where: {
            token: token
        },
        order: [["idx", "DESC"]]
    })
        .then(result => {
            if (result !== null) {
                socketAttr.set(socket.id, {
                    name: result.member.nickName,
                    room: ""
                });
                return next();
            } else {
                return new Error("Authentication Error");
            }
        })
        .catch(err => {
            console.error(err);
            return next(new Error("Authentication Error"));
        });
};
export const connection = (socket: Socket) => {
    //socket.use((packet, next) => socketTokenCheck(socket, next));
    socket.join("default", () => {
        socket.leave(socket.id);
        socketAttr.get(socket.id).room = "default";
        broadcastRoom(socket, "Join new user...");
    });
    websocket.clients((error: any, clients: any) => {
        if (error) {
            console.error(error);
        }
        console.log(`Connections ${clients}`);
    });
    socket.on("change name", (data: any): void => {
        if (data.id.trim().length > 0) {
            let attr = socketAttr.get(socket.id);
            let oldName = attr.name;
            attr.name = data.id;
            console.log(
                "CHANGE NAME %s -> %s",
                socket.id,
                socketAttr.get(socket.id)
            );
            broadcastRoom(socket, "Change name" + data.id, true);
        } else {
            broadcastRoom(socket, "Fail to Change name!", true);
        }
    });

    socket.on("join Room", (data: any): void => {
        if (data.room.trim().length > 0) {
            let joinRoom =
                data.room.trim().length > 0 ? data.room.trim() : "default";
            let attr = socketAttr.get(socket.id);
            let oldRoom = attr.room;

            console.log(
                "%s change room %s -> %s",
                socketAttr.get(socket.id).name,
                oldRoom,
                attr.room
            );
            socket.join(joinRoom, () => {
                if (oldRoom.length > 0) {
                    socket.leave(oldRoom);
                    broadcastRoom(socket, "Leave room...", true)
                        .then(() => {
                            attr.room = joinRoom;
                            broadcastRoom(socket, "Join new user...", true);
                        })
                        .catch(err => {
                            console.error(err);
                            socket.leave(joinRoom);
                            socket.join(oldRoom);
                            websocket.to(socket.id).emit("send data", {
                                sender: socketAttr.get(socket.id).name,
                                msg: "Fail to join room",
                                date: Date.now()
                            });
                        });
                } else {
                    socket.leave(oldRoom);
                    broadcastRoom(socket, "Leave room...", true)
                        .then(() => {
                            attr.room = joinRoom;
                            broadcastRoom(socket, "Join new user...", true);
                        })
                        .catch(err => {
                            console.error(err);
                            socket.leave(joinRoom);
                            socket.join(oldRoom);
                            websocket.to(socket.id).emit("send data", {
                                sender: socketAttr.get(socket.id).name,
                                msg: "Fail to join room",
                                date: Date.now()
                            });
                        });
                }
            });
        } else {
            let attr = socketAttr.get(socket.id);
            let oldRoom = attr.room;
            console.log(
                "%s change room %s -> %s",
                socket.id,
                attr.room,
                "default"
            );
            socket.leave(oldRoom);
            socket.join("default", () => {
                broadcastRoom(socket, "Leave room...", true)
                    .then(() => {
                        attr.room = "default";
                        broadcastRoom(socket, "Join new user...", true);
                    })
                    .catch(err => {
                        console.error(err);
                        socket.leave("default");
                        socket.join(oldRoom);
                        websocket.to(socket.id).emit("send data", {
                            sender: socketAttr.get(socket.id).name,
                            msg: "Fail to join room",
                            date: Date.now()
                        });
                    });
            });
        }
    });
    socket.on("send msg", (data: any): void => {
        console.log(socket.rooms);
        console.log(data);
        console.log(socketAttr.get(socket.id));
        broadcastRoom(socket, data.msg);
        // client.write(data.sender + " > " + data.msg);
    });
    socket.on("disconnect", (reason: any): void => {
        broadcastRoom(socket, "disconnect...", true).then(() => {
            socketAttr.delete(socket.id);
            console.log(`${socket.id} disconnect...\nreson > ${reason}`);
        });
    });
    socket.on("error", (err: any): void => {
        console.error(err);
        socket.disconnect(true);
    });
};
