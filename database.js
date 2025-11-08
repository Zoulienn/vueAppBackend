import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function connectToDb() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        return client;
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
    }
}
