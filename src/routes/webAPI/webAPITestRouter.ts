import express, { Request, Response, NextFunction } from "express";

import path from "path";
import fs from "fs";
import multer from "multer";
import ffmepg from "fluent-ffmpeg";
import logger from "../../config/winston";
//import * as speech from "@google-cloud/speech";
var FfmpegCommand = require("fluent-ffmpeg");
var command = new FfmpegCommand();
const speech = require("@google-cloud/speech");
const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "..", "..", "uploads") });
/**
 * websocket 활용 라우팅 예정...
 * 기능이 없음.
 */
router.get("/media", (req: Request, res: Response) => {
    res.render("webapi/html5Media");
});

router.post(
    "/media",
    upload.single("uploadFile"),
    async (req: Request, res: Response) => {
        logger.debug("media file upload test");
        //req.file .
        logger.debug(req.file);
        const client = new speech.SpeechClient();
        const file = fs.readFileSync(req.file.path);
        const audioBytes = file.toString("base64");
        const audio = {
            content: audioBytes
        };
        const config = {
            encoding: "LINEAR16",
            sampleRateHertz: 16000,
            languageCode: "en-US"
        };
        const request = {
            audio: audio,
            config: config
        };
        try {
            // Detects speech in the audio file
            const [operation] = await client.longRunningRecognize(request);
            // Get a Promise representation of the final result of the job
            const [response] = await operation.promise();
            const transcription = response.results
                .map((result: any) => result.alternatives[0].transcript)
                .join("\n");
            logger.debug(`Transcription: ${transcription}`);
        } catch (e) {
            logger.error(e);
        } finally {
            return res.status(200).end();
        }
        const uploadData = fs.readFileSync(req.file.path);
        ffmepg(req.file.path)
            .format("flac")
            .on("error", err => {
                logger.error(err);
                return res.status(500).send(err);
            })
            .on("end", async () => {
                logger.info(req.file.originalname + " CONVERT SUCCESS!");
            })
            .saveToFile(
                path.join(__dirname, "..", "..", "uploads", "convert.flac")
            );
        logger.info("async function?");

        /*
    const client = new speech.SpeechClient();
    
    // const gcsUri = 'gs://my-bucket/audio.raw';
    // const encoding = 'Encoding of the audio file, e.g. LINEAR16';
    // const sampleRateHertz = 16000;
    // const languageCode = 'BCP-47 language code, e.g. en-US';
      
    const config = {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
        };
        
        const audio = {
        uri: gcsUri,
        };
        
        const request = {
        config: config,
        audio: audio,
        };
        
        // Detects speech in the audio file. This creates a recognition job that you
        // can wait for now, or get its result later.
        const [operation] = await client.longRunningRecognize(request);
        // Get a Promise representation of the final result of the job
        const [response] = await operation.promise();
        const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
        logger.info(`Transcription: ${transcription}`);
        */
    }
);

//join
//router.get("/:channel", (req: Request, res: Response) => {});

export default router;
