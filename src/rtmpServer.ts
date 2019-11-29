const NodeMediaServer = require("node-media-server");
import logger from "./config/winston";
import path from "path";
import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: path.resolve(__dirname, ".env") });
}

const config = require(path.join(__dirname, "config", "rtmp.json"));
config.rtmp.port = process.env.RTMP_PORT || 1935;
config.http.port = process.env.HTTP_PORT || 80;
config.http.mediaroot =
    process.env.MEDIA_ROOT ||
    [__dirname.replace(/\\/g, "/"), "media"].join("/");
config.trans.ffmpeg = process.env.FFMPEG;

const nms = new NodeMediaServer(config);
//nms.run();
nms.on("prePublish", (id: any, StreamPath: any, args: any) => {
    logger.debug(
        "[NodeEvent on prePublish]" +
            `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
    );
    // let session = nms.getSession(id);
    // session.reject();
});

nms.on("postPublish", (id: any, StreamPath: any, args: any) => {
    logger.debug(
        "[NodeEvent on postPublish]" +
            `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
    );
});

nms.on("donePublish", (id: any, StreamPath: any, args: any) => {
    logger.debug(
        "[NodeEvent on donePublish]" +
            `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
    );
});
nms.on("prePlay", (id: any, StreamPath: any, args: any) => {
    logger.debug(
        "[NodeEvent on prePlay]" +
            `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
    );
    // let session = nms.getSession(id);
    // session.reject();
});

nms.on("postPlay", (id: any, StreamPath: any, args: any) => {
    logger.debug(
        "[NodeEvent on postPlay]" +
            `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
    );
});

nms.on("donePlay", (id: any, StreamPath: any, args: any) => {
    logger.debug(
        "[NodeEvent on donePlay]" +
            `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
    );
});
export default nms;
/**
 * TEST CMD COMMAND
 * ffmpeg -y -loglevel warning -loglevel info -video_size 1920x1080 -framerate 60 -f gdigrab -i desktop -offset_x 0 -offset_y 0 -ac 2 -threads 4 -preset ultrafast -tune zerolatency -b 900k -vcodec libx264 -acodec aac -f flv rtmp://localhost:1935/live/test
 */
