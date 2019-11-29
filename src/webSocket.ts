import { websocket } from "./app";
import io, { Socket } from "socket.io";
//text to speech
import fs from "fs";
import util from "util";
import path from "path";
// import buffer from "buffer";
import * as textToSpeech from "@google-cloud/text-to-speech";
import { broadcastRoom } from "./socket";
//logger
import logger from "./config/winston";
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
    logger.info("Audio content written to file: output.mp3");
};

export const socketAttr = new Map();

export const connection = (socket: Socket) => {
    //socket.use((packet, next) => socketTokenCheck(socket, next));
    socket.join("default", () => {
        socket.leave(socket.id);
        socketAttr.get(socket.id).room = "default";
        broadcastRoom(socket, "Join new user...");
    });
    websocket.clients((error: any, clients: any) => {
        if (error) {
            logger.error(error);
        }
        logger.socket(`Connections ${clients}`);
    });
    socket.on("change name", (data: any): void => {
        if (data.id.trim().length > 0) {
            let attr = socketAttr.get(socket.id);
            let oldName = attr.name;
            attr.name = data.id;
            logger.socket(
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

            logger.socket(
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
                            logger.error(err);
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
                            logger.error(err);
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
            logger.socket(
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
                        logger.error(err);
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
        logger.socket(
            `${socketAttr.get(socket.id).name} ${socket.rooms} ${data}`
        );
        broadcastRoom(socket, data.msg);
        // client.write(data.sender + " > " + data.msg);
    });
    socket.on("disconnect", (reason: any): void => {
        broadcastRoom(socket, "disconnect...", true).then(() => {
            socketAttr.delete(socket.id);
            logger.socket(`${socket.id} disconnect...\nreson > ${reason}`);
        });
    });
    socket.on("error", (err: any): void => {
        logger.error(err);
        socket.disconnect(true);
    });
};
