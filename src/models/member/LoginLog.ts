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
    ForeignKey,
    Default,
    BelongsTo
} from "sequelize-typescript";
import { Member } from "./Member";
import { Token } from "./Token";

@Table({
    tableName: "loginlog"
})
export class LoginLog extends Model<LoginLog> {
    @AutoIncrement
    @PrimaryKey
    @Column(DataType.INTEGER)
    idx!: number;

    @Comment("members idx or fail to null")
    @ForeignKey(() => Member)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    get memberIdx(): number {
        return this.getDataValue("memberIdx");
    }
    set memberIdx(value: number) {
        this.setDataValue("memberIdx", value);
    }

    @BelongsTo(() => Member)
    member?: Member;

    @Comment("login request ip address")
    @AllowNull(false)
    @Column(DataType.STRING)
    ipaddress!: string;

    @Comment("login request referrer")
    @AllowNull(false)
    @Column(DataType.STRING)
    reqURI!: string;

    @Comment("tokens idx")
    @ForeignKey(() => Token)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    get tokenIdx(): number {
        return this.getDataValue("tokenIdx");
    }
    set tokenIdx(value: number) {
        this.setDataValue("tokenIdx", value);
    }
    @BelongsTo(() => Token)
    token?: Token;

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
