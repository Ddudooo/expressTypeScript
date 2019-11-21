import {
    Model,
    Column,
    Table,
    UpdatedAt,
    CreatedAt,
    PrimaryKey,
    AutoIncrement,
    Comment,
    DataType,
    AllowNull,
    ForeignKey,
    Default,
    BelongsTo
} from "sequelize-typescript";
import { Admin } from "./Admin";
import { AdminToken } from "./AdminToken";

/**
 * 어드민 로그인 시도 로그 정의
 */
@Table({
    tableName: "admin_loginlog"
})
export class AdminLoginLog extends Model<AdminLoginLog> {
    @AutoIncrement
    @PrimaryKey
    @Column(DataType.INTEGER)
    idx!: number;

    @Comment("admin idx or fail to null")
    @ForeignKey(() => Admin)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    get adminIdx(): number {
        return this.getDataValue("adminIdx");
    }
    set adminIdx(value: number) {
        this.setDataValue("adminIdx", value);
    }

    @BelongsTo(() => Admin)
    admin?: Admin;

    @Comment("login request ip address")
    @AllowNull(false)
    @Column(DataType.STRING)
    ipaddress!: string;

    @Comment("login request referrer")
    @AllowNull(false)
    @Column(DataType.STRING)
    reqURI!: string;

    @Comment("tokens idx")
    @ForeignKey(() => AdminToken)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    get tokenIdx(): number | null {
        return this.getDataValue("tokenIdx");
    }
    set tokenIdx(value: number | null) {
        this.setDataValue("tokenIdx", value);
    }
    @BelongsTo(() => AdminToken)
    token?: AdminToken;

    @Comment("login success 1 / fail 0")
    @AllowNull(true)
    @Default(false)
    @Column(DataType.BOOLEAN)
    get confirm(): boolean {
        return this.getDataValue("confirm");
    }
    set confirm(value: boolean) {
        this.setDataValue("confirm", value);
    }

    @CreatedAt
    regDate!: Date;

    @UpdatedAt
    changeDate!: Date;
}
