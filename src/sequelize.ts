import path from "path";
import { Sequelize } from "sequelize-typescript";

const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, "config", "config.json"))[env];

export const sequelize: Sequelize = new Sequelize(config);

sequelize.addModels([__dirname + "/models/**/!(index.*)"]);
