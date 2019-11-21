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
    Default,
    ForeignKey,
    BelongsTo,
    HasMany
} from "sequelize-typescript";
import { Member } from "./Member";
import { LoginLog } from ".";

/**
 * 유저 JWT 로그
 */
@Table
export class Token extends Model<Token> {
    @AutoIncrement
    @PrimaryKey
    @Column(DataType.INTEGER)
    idx!: number;

    @AllowNull(false)
    @ForeignKey(() => Member)
    @Comment("유저 인덱스")
    @Column(DataType.INTEGER)
    memberIdx!: number;

    @AllowNull(false)
    @Column(DataType.STRING(500))
    token!: string;

    @AllowNull(false)
    @Default(1)
    @Comment("토큰 타입/ 리프래쉬 토큰 - 0, 엑세스 토큰 - 1")
    @Column(DataType.TINYINT)
    tokenType!: number;

    @AllowNull(false)
    @Comment("토큰 페이로드 데이터 암호화 솔트")
    @Column(DataType.STRING)
    dataSalt!: string;

    @AllowNull(false)
    @Comment("토큰 만료일")
    @Column(DataType.DATE)
    expired!: Date;

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    block!: boolean;

    @CreatedAt
    regDate!: Date;

    @UpdatedAt
    changeDate!: Date;

    @BelongsTo(() => Member)
    member!: Member;

    @HasMany(() => LoginLog)
    loginLog?: LoginLog[];
}
