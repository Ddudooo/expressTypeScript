//const request = require("request");
import querystring from "querystring";
import { searchLocaleCode } from "./localeCode";
// const rp = require("request-promise-native");
import * as rp from "request-promise-native";
import path from "path";
import fs from "fs";

const { TranslationServiceClient } = require("@google-cloud/translate").v3beta1;

const keyfile = path.join(__dirname, "..", "..", "config", "google.json");
const projectId = "test-1574044437250";
const location = "global";
const translationClient = new TranslationServiceClient({
    keyFilename: process.env["GOOGLE_APPLICATION_CREDENTIALS"] || keyfile
});
export async function translateText(sl: string, tl: string, text: string) {
    const request = {
        parent: translationClient.locationPath(projectId, location),
        contents: [text],
        mimeType: "text/plain",
        targetLanguageCode: tl
    };

    const [response] = await translationClient.translateText(request);
    return response;
}

const generateURI = (question: string[]): string => {
    let parameter = {
        sl: question.length < 3 ? "auto" : searchLocaleCode(question[0]),
        tl: question.length < 2 ? "auto" : searchLocaleCode(question[1]),
        q: question[3]
    };
    if (parameter.sl === "auto") {
        if (parameter.tl === "auto") {
            parameter.q =
                question.length >= 3
                    ? question.slice(2).join(" ")
                    : question.length >= 2
                    ? question.slice(1).join(" ")
                    : question.join(" ");
        } else {
            parameter.q = question.slice(2).join(" ");
        }
    } else {
        parameter.q = question.slice(2).join(" ");
    }
    // console.log(parameter);
    //parameter.q = parameter.q.join(" ");
    return `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&${querystring.stringify(
        parameter
    )}`;
};

function translateGoogle(uri: string) {
    return rp.get(uri);
}

export const translate = (question: string[]) => {
    return translateGoogle(generateURI([...question]));
};
