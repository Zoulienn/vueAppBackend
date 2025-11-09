import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDb } from "./database.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

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

// Serve lesson images safely
app.get("/images/:filename", (req, res) => {
    const filePath = path.join(__dirname, "images", req.params.filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`Image not found: ${req.params.filename}`);
            return res.status(404).json({ error: "Image not found" });
        }
        res.sendFile(filePath);
    });
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

app.post("/orders", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { name, phone, lessonIDs, spaces, items } = req.body;

        // Basic validation
        if (!name || !phone || !Array.isArray(lessonIDs) || lessonIDs.length === 0) {
            return res.status(400).json({ error: "Invalid order data" });
        }

        // Insert the order into Orders collection
        const result = await db.collection("Orders").insertOne({
            name,
            phone,
            lessonIDs,
            spaces,
            items,
            createdAt: new Date(),
        });

        res.status(201).json({
            message: "Order created successfully",
            orderId: result.insertedId,
        });
    } catch (error) {
        console.error("Error saving order:", error);
        res.status(500).json({ error: "Internal server error" });
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
