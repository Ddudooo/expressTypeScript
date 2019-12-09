import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import logger from "./config/winston";

const env = process.env.NODE_ENV || "development";
let config;
try {
    const configPath = path.join(__dirname, "config", "config.json");
    if (fs.existsSync(configPath)) {
        config = require(path.join(__dirname, "config", "config.json"))[env];
        if (config === undefined) throw new Error("Config Undefined");
    } else {
        throw new Error("Not Found config file");
    }
} catch (e) {
    logger.warn(e);
    config = {
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        dialect: process.env.DB_DIALECT,
        operatorAliases: false,
        timezone: process.env.DB_TIMEZONE,
        define: {
            charset: process.env.MYSQL_CHATSET,
            collate: process.env.MYSQL_COLLATE,
            timestamps: true
        }
    };
}
config.logging = (msg: any) => {
    // let colums = process.stdout.columns;
    // let result = msg.match(new RegExp(`.{1,${colums - 40}}`, "g")).join("\n");
    return logger.data(msg);
};
export const sequelize: Sequelize = new Sequelize(config);

sequelize.addModels([__dirname + "/models/**/!(index.*)"]);
