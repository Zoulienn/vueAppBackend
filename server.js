// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDb } from "./database.js";
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(cors());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend folder as static
app.use(express.static(path.join(__dirname, "../vueAppFrontend")));

// Logger middleware
app.use((req, res, next) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../vueAppFrontend/index.html"));
});

app.get("/lessons", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const lessons = await db.collection("Lessons")
            .find()
            .toArray();

        res.json(lessons);
    } catch (error) {
        console.error("Error fetching lessons:", error);
        res.status(500).send("Error fetching lessons");
    }
});


// Start server after DB connection
async function startServer() {
    try {
        const client = await connectToDb();
        app.locals.db = client.db(process.env.DB_NAME);

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error starting the server:", error);
    }
}

startServer();
