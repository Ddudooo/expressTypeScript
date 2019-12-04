const winston = require("winston");
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const { combine, timestamp, label, prettyPrint } = format;
import fs from "fs";
import path from "path";

const env = process.env.NODE_ENV || "development";
const logDir = path.join(__dirname, "..", "log");

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const dailyRotateFileTransport = new transports.DailyRotateFile({
    level: env === "development" ? "debug" : "info",
    filename: `${logDir}/%DATE%-smart-push.log`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d"
});

const config = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        data: 3,
        verbose: 4,
        socket: 5,
        trace: 6,
        debug: 7
    },
    colors: {
        error: "red bold",
        warn: "yellow",
        info: "green",
        data: "grey",
        verbose: "cyan",
        socket: "magenta bold",
        trace: "yellow",
        debug: "blue bold"
    }
};

winston.addColors(config.colors);

const logger = createLogger({
    levels: config.levels,
    level: env === "development" ? "debug" : "info",
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss"
        }),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.Console({
            level: env === "development" ? "debug" : "info",
            silent: env === "test" ? true : false,
            format: format.combine(
                format(function(info: any, opts: any) {
                    info.level = `[${info.level.toUpperCase()}]`;
                    return info;
                })(),
                format.colorize(),
                format.printf((info: any) => {
                    let prefix = `${info.timestamp} ${process.pid} ${info.level}`;
                    let msg = [];
                    if (
                        info.message.indexOf("\n") > 0 ||
                        info.message.indexOf("\r") > 0
                    ) {
                        for (const a of info.message.split("\n")) {
                            if (a.trim().length > 0) {
                                for (const b of a.split("\r")) {
                                    if (b.trim().length > 0) {
                                        msg.push(`${prefix} ${b}`);
                                    }
                                }
                            }
                        }
                    } else {
                        msg.push(`${prefix} ${info.message}`);
                    }

                    if (info.stack && env !== "production") {
                        //console.log(info.stack);
                        for (const a of info.stack.split("\n")) {
                            if (a.trim().length > 0) {
                                for (const b of a.split("\r")) {
                                    if (b.trim().length > 0) {
                                        msg.push(`${prefix} ${b}`);
                                    }
                                }
                            }
                        }
                    }
                    return msg.join("\n");
                })
            )
        }),
        dailyRotateFileTransport
    ]
});

logger.stream = {
    write: (msg: any, encording: any) => {
        logger.info(msg);
    }
};

export default logger;
