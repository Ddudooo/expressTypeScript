import { Token, Member } from "../models/member";

import jwt from "jsonwebtoken";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Transaction } from "sequelize/types";
import { AdminToken, Admin, AdminActionLog } from "../models/admin";
import Bluebird from "bluebird";

export class payloadJWT {
    exp?: number;
    data?: any;
}

export function createJWT(
    payload: payloadJWT,
    type: number = 1,
    t: Transaction,
    admin?: string
): Promise<Token | AdminToken> {
    let privateKey: Buffer = fs.readFileSync(
        path.join(__dirname, "..", "config", "ServerPrivateKey.pem")
    );
    let [newPayload, salt] = payloadDataEncryt(payload);
    let token: string = jwt.sign(newPayload, privateKey, {
        algorithm: "RS512"
    });
    return afterCreateJWT(payload, token, salt, type, t, admin);
}

function afterCreateJWT(
    payload: payloadJWT,
    token: string,
    salt: string,
    type: number = 1,
    t: Transaction,
    admin?: string
) {
    if (admin === "admin") {
        return AdminToken.create(
            {
                adminIdx: payload.data.idx,
                token: token,
                dataSalt: salt,
                tokenType: type,
                expired: Number(payload.exp) * 1000
            },
            { transaction: t }
        );
    } else {
        return Token.create(
            {
                memberIdx: payload.data.idx,
                token: token,
                dataSalt: salt,
                tokenType: type,
                expired: Number(payload.exp) * 1000
            },
            { transaction: t }
        );
    }
}

function payloadDataEncryt(payload: payloadJWT): [payloadJWT, string] {
    let salt = crypto.randomBytes(32).toString("base64");
    let data =
        payload.data !== undefined
            ? payload.data.toString()
            : crypto.randomBytes(32).toString("base64");
    let result = JSON.parse(JSON.stringify(payload));
    result.data = crypto
        .pbkdf2Sync(data, salt, 10000, 32, "sha512")
        .toString("base64");
    return [result, salt];
}

export function verifyJWT(token: string): string {
    let publicKey: Buffer = fs.readFileSync(
        path.join(__dirname, "..", "config", "ServerPublicKey.pem")
    );
    try {
        let payload = jwt.verify(token, publicKey);
        return payload.toString();
    } catch (err) {
        throw err;
    }
}

export function refreshToken(token: string, t: Transaction, type?: string) {
    return new Promise((resolve, reject) => {
        if (type === "admin") {
            let access: payloadJWT;
            findToken(token, t, "admin")
                .then(result => {
                    if (result.length > 0) {
                        return findAdminByIdx(result[0].adminIdx, t);
                    } else {
                        reject("NOT FOUND TOKEN");
                    }
                })
                .then(admin => {
                    if (admin !== null && admin !== undefined) {
                        access = {
                            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 1, // 유효기간 한시간.
                            data: {
                                name: admin.adminName,
                                idx: admin.idx
                            }
                        };
                        return createJWT(access, 1, t, "admin");
                    } else {
                        reject("NOT FOUND USER");
                    }
                })
                .then(result => {
                    resolve(result);
                })
                .catch(err => reject(err));
        } else {
            findToken(token, t)
                .then(result => {
                    if (result.length > 0) {
                        return findMemberByIdx(result[0].memberIdx, t);
                    } else {
                        reject("NOT FOUND TOKEN");
                    }
                })
                .then(user => {
                    if (user !== null && user !== undefined) {
                        let access: payloadJWT = {
                            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 1, // 유효기간 한시간.
                            data: {
                                name: user.nickName,
                                idx: user.idx
                            }
                        };
                        return createJWT(access, 1, t);
                    } else {
                        reject("NOT FOUND USER");
                    }
                })
                .then(result => resolve(result))
                .catch(err => reject(err));
        }
    });
}

function findToken(
    token: string,
    t: Transaction,
    type?: string
): Promise<any[]> {
    if (type === "admin") {
        return AdminToken.findAll({
            where: {
                token: token,
                block: 0
            },
            order: [["idx", "DESC"]],
            transaction: t
        });
    } else {
        return Token.findAll({
            where: {
                token: token,
                block: 0
            },
            order: [["idx", "DESC"]],
            transaction: t
        });
    }
}

function findMemberByIdx(idx: any, t: Transaction) {
    return Member.findByPk(idx, { transaction: t });
}

function findAdminByIdx(idx: any, t: Transaction) {
    return Admin.findByPk(idx, { transaction: t });
}

export function disableJWT(
    token: string,
    t: Transaction,
    admin?: string
): Promise<[number, AdminToken[]] | [number, Token[]]> {
    if (admin === "admin") {
        return AdminToken.update(
            {
                block: 1
            },
            {
                where: {
                    token: token
                },
                transaction: t
            }
        );
    } else {
        return Token.update(
            {
                block: 1
            },
            {
                where: {
                    token: token
                },
                transaction: t
            }
        );
    }
}
