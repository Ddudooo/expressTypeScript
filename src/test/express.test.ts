import { expect } from "chai";
//import httpMocks from "node-mocks-http";
//const sinon = require("sinon");
import sinon from "sinon";
import request from "supertest";
import cheerio from "cheerio";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, ".env") });

import app from "../app";
import { Member, LoginLog, Token } from "../models/member";

function pathCreate(
    path: string,
    method: string,
    result: { [key: string]: any | Function }
) {
    return { path: path, method: method, result: result };
}

function pathTest(
    req: request.SuperTest<request.Test>,
    a: { [key: string]: any }
) {
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
        const result: Member[] = [];
        const fakeUser = new Member({
            idx: 0,
            userId: "test",
            password: "1234"
        });
        const tokenUtils = require("../utils/tokenUtils");
        const fakeLog = LoginLog.build({ ipaddress: "test", reqURI: "test" });
        result.push(fakeUser);
        sinon.stub(Member, "findAll").resolves(result);
        sinon
            .stub(tokenUtils, "createJWT")
            .resolves({ idx: 0, token: "token", exp: 0 });
        sinon.stub(fakeUser, "checkPassword").callsFake(ps => {
            if (ps === "1234") return true;
            else return false;
        });
        sinon.stub(LoginLog, "build").returns(fakeLog);
        sinon.stub(fakeLog, "save").resolves();
    });
    afterEach(() => {
        sinon.restore();
    });
    describe("UnAuthorized Path", () => {
        const path = [];
        path.push(pathCreate("/", "get", { status: 200 }));
        path.push(pathCreate("/signin", "get", { status: 200 }));
        path.push(pathCreate("/signup", "get", { status: 200 }));
        for (const a of path) {
            pathTest(req, a);
        }
    });
    describe("Authorize Require Path", () => {
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
    describe("Login Member", () => {
        it("Login Fail", async () => {
            const res = await req.post("/signin").expect(401);
            const cookie = res.header["set-cookie"];
            expect(cookie.indexOf("test.sign")).to.equal(-1);
        });

        it("Login Success", async () => {
            const res = await req
                .post("/signin")
                .send({
                    "signin-id": "test",
                    "signin-pw": "1234"
                })
                .expect(302);
            const cookie = res.header["set-cookie"];
            expect(cookie.join(",")).to.have.string("test.sign");
        });

        it("URL PATH : /member/info", async () => {
            const tokenUtils = require("../utils/tokenUtils");
            sinon.stub(tokenUtils, "verifyJWT").callsFake(() => "accesstoken");
            sinon
                .stub(Token, "findAll")
                .resolves([new Token({ memberIdx: 0 })]);
            sinon.stub(Member, "findByPk").resolves(
                new Member({
                    idx: 0,
                    userId: "test",
                    password: "1234"
                })
            );
            const res = await req
                .get("/member/info")
                .set("Cookie", "test.sign=acc;test.refresh=ref")
                .expect(200);

            const $ = cheerio.load(res.text);
            const bodyTitle = $("h2")
                .first()
                .text();
            expect(bodyTitle).to.not.equal("SIGN IN");
            sinon.restore();
        });
    });
});
