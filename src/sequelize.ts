import path from "path";
import { Sequelize } from "sequelize-typescript";
import logger from "./config/winston";

const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, "config", "config.json"))[env];
config.logging = (msg: any) => {
    // let colums = process.stdout.columns;
    // let result = msg.match(new RegExp(`.{1,${colums - 40}}`, "g")).join("\n");
    return logger.data(msg);
};
export const sequelize: Sequelize = new Sequelize(config);

sequelize.addModels([__dirname + "/models/**/!(index.*)"]);
