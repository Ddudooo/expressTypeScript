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
import { Member, Token } from "../member";
/**
 * 유저 웹소켓 채팅 로그
 */
@Table({
    tableName: "chatlog"
})
export class ChatLog extends Model<ChatLog> {
    @AutoIncrement
    @PrimaryKey
    @Column(DataType.INTEGER)
    idx!: number;

    @Comment("유저 idx")
    @ForeignKey(() => Member)
    @AllowNull(false)
    @Column(DataType.INTEGER)
    memberIdx!: number;

    @BelongsTo(() => Member)
    member!: Member;

    @Comment("IP주소")
    @AllowNull(false)
    @Column(DataType.STRING)
    ipaddress!: string;

    @Comment("채팅 방")
    @AllowNull(false)
    @Default("default")
    @Column(DataType.STRING)
    chatRoom!: string;

    @Comment("채팅 내용")
    @AllowNull(false)
    @Column(DataType.STRING(500))
    chat!: string;

    @Comment("토큰 idx")
    @ForeignKey(() => Token)
    @AllowNull(false)
    @Column(DataType.INTEGER)
    tokenIdx!: number;
    @BelongsTo(() => Token)
    token!: Token;

    @CreatedAt
    regDate!: Date;

    @UpdatedAt
    changeDate!: Date;
}
