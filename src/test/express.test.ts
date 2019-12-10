import { expect } from "chai";
//const sinon = require("sinon");
import sinon from "sinon";
import request from "supertest";
import cheerio from "cheerio";

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, ".env") });

import app from "../app";
import { Member, LoginLog, Token } from "../models/member";

describe("Express test", () => {
    const req = request(app);
    beforeEach(() => {
        //로그인 테스트용
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
        const path = [
            "/",
            "/signin",
            "/signup",
            "/webapi/stream",
            "/webapi/media"
        ];
        for (const a of path) {
            it(`URL PATH : ${a}`, async () => {
                await req.get(a).expect(200);
            });
        }
    });
    describe("Authorize Require Path", () => {
        const path = [
            "/logout",
            "/member/info",
            "/tl",
            "/navi",
            "/webapi/socket"
        ];
        const expectFunc = (res: request.Response) => {
            expect(res.status).to.be.equal(401);
            const $ = cheerio.load(res.text);
            const bodyTitle = $("h2")
                .first()
                .text();
            expect(bodyTitle).to.equal("SIGN IN");
        };
        for (const a of path) {
            it(`URL PATH : ${a}`, async () => {
                await req.get(a).expect(expectFunc);
            });
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
    });

    describe("ACCESS TOKEN TEST", () => {
        beforeEach(() => {
            const tokenUtils = require("../utils/tokenUtils");
            sinon.stub(tokenUtils, "verifyJWT").callsFake(() => "accesstoken");
            sinon
                .stub(tokenUtils, "disableJWT")
                .resolves([[new Token({ memberIdx: 0 })], 1]);

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
        });
        afterEach(() => {
            sinon.restore();
        });
        const path = ["/member/info", "/tl", "/navi", "/webapi/socket"];
        const expectFunc = (res: request.Response) => {
            expect(res.status).to.be.equal(200);
            const $ = cheerio.load(res.text);
            const bodyTitle = $("h2")
                .first()
                .text();
            expect(bodyTitle).to.not.equal("SIGN IN");
            sinon.restore();
        };
        for (const a of path) {
            it(`URL PATH : ${a}`, async () => {
                await req
                    .get(a)
                    .set("Cookie", "test.sign=acc;test.refresh=ref")
                    .expect(expectFunc);
            });
        }
        it(`URL PATH : /logout`, async () => {
            await req
                .get("/logout")
                .set("Cookie", "test.sign=acc;test.refresh=ref")
                .expect(302);
        });
    });

    describe("REFRESH TOKEN TEST", () => {
        beforeEach(() => {
            const tokenUtils = require("../utils/tokenUtils");

            sinon.stub(tokenUtils, "verifyJWT").callsFake(token => {
                if (token === "acc") {
                    throw new Error();
                } else {
                    return "refresh";
                }
            });
            sinon
                .stub(tokenUtils, "refreshToken")
                .resolves(new Token({ memberIdx: 0 }));
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
        });
        afterEach(() => {
            sinon.restore();
        });
        const path = ["/member/info", "/tl", "/navi", "/webapi/socket"];
        const expectFunc = (res: request.Response) => {
            expect(res.status).to.be.equal(302);
            const $ = cheerio.load(res.text);
            const bodyTitle = $("h2")
                .first()
                .text();
            expect(bodyTitle).to.not.equal("SIGN IN");
            sinon.restore();
        };
        for (const a of path) {
            it(`URL PATH : ${a}`, async () => {
                await req
                    .get(a)
                    .set("Cookie", "test.sign=acc;test.refresh=ref")
                    .expect(expectFunc);
            });
        }
        it(`URL PATH : /logout`, async () => {
            await req
                .get("/logout")
                .set("Cookie", "test.sign=acc;test.refresh=ref")
                .expect(302);
        });
    });
});
