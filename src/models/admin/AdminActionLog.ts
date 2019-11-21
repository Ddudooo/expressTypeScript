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

@Table({
    tableName: "admin_actionlog"
})
export class AdminActionLog extends Model<AdminActionLog> {
    @AutoIncrement
    @PrimaryKey
    @Column(DataType.INTEGER)
    idx!: number;

    @Comment("admin idx")
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

    @Comment("action comment")
    @AllowNull(false)
    @Column(DataType.STRING)
    comment!: string;

    @Comment("tokens idx")
    @ForeignKey(() => AdminToken)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    get tokenIdx(): number {
        return this.getDataValue("tokenIdx");
    }
    set tokenIdx(value: number) {
        this.setDataValue("tokenIdx", value);
    }
    @BelongsTo(() => AdminToken)
    token?: AdminToken;

    @CreatedAt
    regDate!: Date;

    @UpdatedAt
    changeDate!: Date;
}
