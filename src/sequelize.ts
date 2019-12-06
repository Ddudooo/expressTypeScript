import path from "path";
import { Sequelize } from "sequelize-typescript";
import logger from "./config/winston";

const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, "config", "config.json"))[env] || {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    host: process.env.MYSQL_HOST,
    dialect: process.env.DB_DIALECT,
    operatorAliases: false,
    timezone: process.env.DB_TIMEZONE,
    define: {
        charset: process.env.MYSQL_CHATSET,
        collate: process.env.MYSQL_COLLATE,
        timestamps: true
    }
};
config.logging = (msg: any) => {
    // let colums = process.stdout.columns;
    // let result = msg.match(new RegExp(`.{1,${colums - 40}}`, "g")).join("\n");
    return logger.data(msg);
};
export const sequelize: Sequelize = new Sequelize(config);

sequelize.addModels([__dirname + "/models/**/!(index.*)"]);
