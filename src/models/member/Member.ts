import {
    Model,
    Column,
    Table,
    UpdatedAt,
    CreatedAt,
    PrimaryKey,
    AutoIncrement,
    Comment,
    Unique,
    DataType,
    BeforeCreate,
    BeforeUpdate,
    AllowNull,
    BeforeFind,
    HasMany
} from "sequelize-typescript";
import crypto from "crypto";
import { Token } from "./Token";
import { LoginLog } from ".";

/**
 * 유저
 */
@Table
export class Member extends Model<Member> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    idx!: number;

    @Comment("유저아이디")
    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    userId!: string;

    @Comment("패스워드")
    @AllowNull(false)
    @Column(DataType.STRING)
    password!: string;

    @Comment("패스워드 salt")
    @Column(DataType.STRING)
    get salt(): string {
        return this.getDataValue("salt");
    }
    set salt(value: string) {
        this.setDataValue("salt", value);
    }

    @Comment("유저 닉네임")
    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    nickName!: string;

    @CreatedAt
    @Column(DataType.DATE)
    regDate!: Date;

    @UpdatedAt
    @Column(DataType.DATE)
    changeDate?: Date;

    @HasMany(() => Token)
    Tokens?: Token[];

    @HasMany(() => LoginLog)
    LoginLog?: LoginLog[];

    @BeforeCreate
    static passwordEncriptic(instance: Member) {
        instance.set("salt", crypto.randomBytes(64).toString("base64"));
        instance.password = crypto
            .pbkdf2Sync(
                instance.password,
                instance.get("salt"),
                10000,
                64,
                "sha512"
            )
            .toString("base64");
    }

    public checkPassword(password: string): boolean {
        const cryptoPW = crypto
            .pbkdf2Sync(password, this.get("salt"), 10000, 64, "sha512")
            .toString("base64");
        if (cryptoPW === this.password) {
            return true;
        } else {
            return false;
        }
    }
}
