import {
    Table,
    PrimaryKey,
    AutoIncrement,
    Column,
    DataType,
    AllowNull,
    ForeignKey,
    Comment,
    Default,
    CreatedAt,
    UpdatedAt,
    BelongsTo,
    HasMany,
    Model
} from "sequelize-typescript";
import { Admin } from "./Admin";
import { AdminLoginLog } from "./AdminLoginLog";

/**
 * 어드민 토큰 로그
 * 기본 유저 토큰이랑 별차이가 없어 컬럼 추가하고 합칠 예정
 */

@Table({
    tableName: "admin_token"
})
export class AdminToken extends Model<AdminToken> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    idx!: number;

    @AllowNull(false)
    @ForeignKey(() => Admin)
    @Comment("어드민 인덱스")
    @Column(DataType.INTEGER)
    adminIdx!: number;

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

    @BelongsTo(() => Admin)
    admin!: Admin;

    @HasMany(() => AdminLoginLog)
    loginLog?: AdminLoginLog[];
}
