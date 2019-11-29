const NodeMediaServer = require("node-media-server");
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

export default nms;
/**
 * TEST CMD COMMAND
 * ffmpeg -y -loglevel warning -loglevel info -video_size 1920x1080 -framerate 60 -f gdigrab -i desktop -offset_x 0 -offset_y 0 -ac 2 -threads 4 -preset ultrafast -tune zerolatency -b 900k -vcodec libx264 -acodec aac -f flv rtmp://localhost:1935/live/test
 */
