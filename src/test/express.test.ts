import chai, { expect, should } from "chai";
//import httpMocks from "node-mocks-http";
//const sinon = require("sinon");
import sinon from "sinon";
import request from "supertest";
import cheerio from "cheerio";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, ".test.env") });

import app from "../app";
import { Member } from "../models/member";
import Bluebird from "bluebird";

function pathCreate(
    path: string,
    method: string,
    result: { [key: string]: any | Function }
) {
    return { path: path, method: method, result: result };
}

function pathTest(req: request.SuperTest<request.Test>, a: any) {
    const aMETHOD = a.method.toUpperCase();
    if (aMETHOD === "GET") {
        return it(`URL PATH : ${a.path}`, async () => {
            if (a.result instanceof Function) {
                await req.get(a.path).expect(a.result);
            } else {
                await req.get(a.path).expect(a.result.status || 200);
            }
        });
    } else if (aMETHOD === "POST") {
        return it(`URL PATH : ${a.path}`, async () => {
            if (a.result instanceof Function) {
                await req.post(a.path).expect(a.result);
            } else {
                await req.post(a.path).expect(a.result.status || 200);
            }
        });
    }
}

describe("Express test", () => {
    const req = request(app);
    beforeEach(() => {
        //sinon.stub(Member, "findAll").resolves(Member[])
        //Setup fake rendering
        // app.set("views", path.join(__dirname, "..", "views"));
        // app.set("view engine", "ext");
        // app.engine("ext", (path, options, callback) => {
        //     const details = Object.assign({ path }, options);
        //     callback(null, JSON.stringify(details));
        // });
    });
    afterEach(() => {
        sinon.restore();
    });
    describe("Route TEST", () => {
        const path = [];
        path.push(pathCreate("/", "get", { status: 200 }));
        path.push(pathCreate("/signin", "get", { status: 200 }));
        path.push(pathCreate("/signup", "get", { status: 200 }));
        for (const a of path) {
            pathTest(req, a);
        }
    });
    describe("Authorize Require Path TEST", () => {
        const path = [];
        const expectFunc = (res: request.Response) => {
            expect(res.status).to.be.equal(401);
            const $ = cheerio.load(res.text);
            const bodyTitle = $("h2")
                .first()
                .text();
            expect(bodyTitle).to.equal("SIGN IN");
        };
        path.push(pathCreate("/logout", "get", expectFunc));
        path.push(pathCreate("/member/info", "get", expectFunc));
        path.push(pathCreate("/tl", "get", expectFunc));
        path.push(pathCreate("/webapi/socket", "get", expectFunc));
        for (const a of path) {
            pathTest(req, a);
        }
    });
    it("Login Fail TEST", async () => {
        cookieParser();
        const res = await req.post("/signin").expect(401);
        const cookie = res.header["set-cookie"];
        expect(cookie.indexOf("test.sign")).to.equal(-1);
    });
    it("Login Success TEST", async () => {
        const res = await req
            .post("/signin")
            .send({
                "signin-id": "test",
                "signin-pw": "test"
            })
            .expect(200);
        const cookie = res.header["set-cookie"];
        expect(cookie.join(",")).to.have.string("test.sign");
    });
});
