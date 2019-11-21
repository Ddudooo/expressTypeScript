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
    AllowNull,
    HasMany
} from "sequelize-typescript";
import crypto from "crypto";
import { AdminToken } from "./AdminToken";
import { AdminLoginLog } from "./AdminLoginLog";
@Table
export class Admin extends Model<Admin> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    idx!: number;

    @Comment("어드민 아이디")
    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    adminId!: string;

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

    @Comment("어드민 이름")
    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    adminName!: string;

    @CreatedAt
    @Column(DataType.DATE)
    regDate!: Date;

    @UpdatedAt
    @Column(DataType.DATE)
    changeDate?: Date;

    @HasMany(() => AdminToken)
    Tokens?: AdminToken[];

    @HasMany(() => AdminLoginLog)
    LoginLog?: AdminLoginLog[];

    @BeforeCreate
    static passwordEncriptic(instance: Admin) {
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
