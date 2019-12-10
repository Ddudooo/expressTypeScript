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
import {
    Admin,
    AdminLoginLog,
    AdminActionLog,
    AdminToken
} from "../models/admin";
import { ChatLog } from "../models/websocket";

/**
 * 유저 사용 기능 위주
 */
describe("Express test", () => {
    // 사용될 모듈 (익스프레스 설정)
    const req = request(app);

    //DB ORM 함수 목업 처리
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

    /**
     * 무작위 '/'로 시작하는 경로 테스트
     * 404 에러 확인용
     */
    describe("NOT FOUND ERROR Path", () => {
        it("Randomize GET Path", async () => {
            let i = 0;
            while (++i > 100) {
                let randPath = Math.random()
                    .toString(36)
                    .substring(10);
                await req.get(`/${randPath}`).expect(404);
            }
        });
        it("Randomize POST Path", async () => {
            let i = 0;
            while (++i > 100) {
                let randPath = Math.random()
                    .toString(36)
                    .substring(10);
                await req.post(`/${randPath}`).expect(404);
            }
        });
    });

    /**
     * 로그인 필요 없는 경로 테스트
     * 로그인되있을시 리다이렉트 경로 테스트
     */
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

            it(`URL PATH REDIRECT : ${a}`, async () => {
                await req
                    .get(a)
                    .set("Cookie", "test.sign=acc;test.refresh=ref")
                    .expect(res => {
                        expect(res.status).to.be.oneOf([200, 302]);
                    });
            });
        }
    });

    /**
     * 로그인 필요 경로 테스트
     * 로그인 안되 있을 시 로그인 페이지 리다이렉트 테스트
     */
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

    /**
     * 유저 로그인 관련 테스트
     * 로그인 실패시, 성공시
     * 유저 가입 시도시 성공, 실패 상태 확인
     */
    describe("Member Sign TEST", () => {
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

        it("Sign up Success", async () => {
            sinon.stub(Member, "create").resolves();
            await req.post("/signup").expect(302);
            sinon.restore();
        });

        it("Sign up Fail", async () => {
            sinon.stub(Member, "create").throws(new Error("Fake error"));
            await req.post("/signup").expect(500);
            sinon.restore();
        });
    });

    /**
     * 액세스 토큰 기능 확인
     */
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
        const path = ["/", "/member/info", "/tl", "/navi", "/webapi/socket"];
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

        it(`URL PATH : /tl (POST)`, async () => {
            await req
                .post("/tl")
                .send({ tl: "ko_KR", question: "hello" })
                .expect(200);

            await req
                .post("/tl")
                .send({ tl: "asfd", question: "fail" })
                .expect(500);
        });
    });

    /**
     * 리프레쉬 토큰 기능 확인
     */
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

/**
 * 어드민 페이지 기능 확인
 */
describe("Express Admin PAGE TEST", () => {
    // 테스트용 request 모듈 설정
    const req = request(app);
    beforeEach(() => {
        //로그인 테스트용
        const result: Admin[] = [];
        const fakeUser = new Admin({
            idx: 0,
            userId: "test",
            password: "1234"
        });
        const tokenUtils = require("../utils/tokenUtils");
        const fakeLog = AdminLoginLog.build({
            ipaddress: "test",
            reqURI: "test"
        });
        result.push(fakeUser);

        sinon.stub(Admin, "findAll").resolves(result);
        sinon
            .stub(tokenUtils, "createJWT")
            .resolves({ idx: 0, token: "token", exp: 0 });
        sinon.stub(fakeUser, "checkPassword").callsFake(ps => {
            if (ps === "1234") return true;
            else return false;
        });
        sinon.stub(AdminLoginLog, "build").returns(fakeLog);
        sinon.stub(AdminActionLog, "create").resolves();
        sinon.stub(fakeLog, "save").resolves();

        //토큰 처리부
        sinon.stub(tokenUtils, "verifyJWT").callsFake(() => "accesstoken");
        sinon
            .stub(tokenUtils, "disableJWT")
            .resolves([[new AdminToken({ adminIdx: 0 })], 1]);

        sinon
            .stub(AdminToken, "findAll")
            .resolves([new AdminToken({ adminIdx: 0 })]);
        sinon.stub(Admin, "findByPk").resolves(
            new Admin({
                idx: 0,
                adminId: "test",
                password: "1234"
            })
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    /**
     * 무작위 '/admin'로 시작하는 경로 테스트
     * 404 에러 확인용
     */
    describe("NOT FOUND ERROR Path", () => {
        it("Randomize GET Path", async () => {
            let i = 0;
            while (++i > 100) {
                let randPath = Math.random()
                    .toString(36)
                    .substring(10);
                await req.get(`/admin/${randPath}`).expect(404);
            }
        });
        it("Randomize POST Path", async () => {
            let i = 0;
            while (++i > 100) {
                let randPath = Math.random()
                    .toString(36)
                    .substring(10);
                await req.post(`/admin/${randPath}`).expect(404);
            }
        });
    });

    /**
     * 유저 정보 관련 어드민 페이지
     */
    describe("Admin Member Menu Routing TEST", () => {
        before(() => {
            sinon.stub(Member, "findAndCountAll").resolves({
                rows: [new Member({ idx: 0, userId: "fake" })],
                count: 1
            });
            sinon.stub(Token, "findAndCountAll").resolves({
                rows: [new Token({ idx: 0, token: "fake" })],
                count: 1
            });
            sinon.stub(LoginLog, "findAndCountAll").resolves({
                rows: [new LoginLog({ idx: 0, chat: "fake" })],
                count: 0
            });
            sinon
                .stub(ChatLog, "findAndCountAll")
                .resolves({ rows: [new ChatLog({ idx: 0 })], count: 1 });
            sinon.stub(ChatLog, "findOne").resolves(new ChatLog({ idx: 0 }));
        });
        after(() => {
            sinon.restore();
        });

        const path = ["/list", "/token/list", "/log/login", "/log/chat"];

        for (const a of path) {
            it(`URL PATH : /admin/menu/member${a}`, async () => {
                await req
                    .get(`/admin/menu/member${a}`)
                    .set("Cookie", "test.admin.sign=fake")
                    .expect(200);
            });
        }
    });
    describe("Admin Menu Routing TEST", () => {
        before(() => {
            sinon.stub(Admin, "findAndCountAll").resolves({
                rows: [new Admin({ idx: 0, adminId: "fake" })],
                count: 1
            });
            sinon.stub(AdminToken, "findAndCountAll").resolves({
                rows: [new AdminToken({ idx: 0 })],
                count: 1
            });
            sinon.stub(AdminActionLog, "findAndCountAll").resolves({
                rows: [new AdminActionLog({ idx: 0 })],
                count: 1
            });
            sinon.stub(AdminLoginLog, "findAndCountAll").resolves({
                rows: [new AdminLoginLog({ idx: 0 })],
                count: 0
            });
        });
        after(() => {
            sinon.restore();
        });

        const path = ["/list", "/token/list", "/log/login", "/log/action"];
        for (const a of path) {
            it(`URL PATH : /admin/menu/admin${a}`, async () => {
                await req
                    .get(`/admin/menu/admin${a}`)
                    .set("Cookie", "test.admin.sign=fake")
                    .expect(200);
            });
        }
    });
});
