import mongoose from "mongoose";
import config from "../config/config.js";

const DataBase = async () => {
    try {
        await mongoose.connect(config.MONGO_URI, { dbName: 'ev' });
        console.log("Database connected");
    } catch (error) {
        console.error("Error connecting to database", error);
        process.exit(1);
    }
}

export default DataBase;