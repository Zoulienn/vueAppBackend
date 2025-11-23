// imports
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDb } from "./database.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware setup
app.use(express.json()); // Allow JSON request bodies
app.use(cors());         // Enable Cross-Origin Resource Sharing

// Helpers to handle file paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger middleware: prints each request to the console
app.use((req, res, next) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Middleware that checks if an image exists before serving it
const imageCheckMiddleware = (req, res, next) => {
    // Only run for /images/... routes
    if (!req.path.startsWith("/images/")) {
        return next();
    }

    const filename = req.path.replace("/images/", "");
    const filePath = path.join(__dirname, "images", filename);

    // Check if the image file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`Image not found: ${filename}`);
            return res.status(404).json({ error: "Image not found" });
        }

        // File exists → continue to static file handler
        next();
    });
};

app.use(imageCheckMiddleware);

// Serve images from the /images folder
app.use("/images", express.static(path.join(__dirname, "images")));

// GET /lessons → fetch all lessons
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

// GET /search?q=... → search lessons by subject or location
app.get('/search', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const q = (req.query.q || '').trim();

        // Escape any special regex characters to avoid errors
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let filter = {};
        // If search term exists, build a regex filter
        if (q.length > 0) {
            const safe = escapeRegex(q);
            // case-insensitive partial match
            const regex = new RegExp(safe, 'i');

            // search subject and location fields
            filter = { $or: [ { subject: regex }, { location: regex } ] };
        }

        const results = await db.collection('Lessons').find(filter).toArray();
        res.json(results);
    } catch (err) {
        console.error('Error in search:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /orders → save a new order
app.post("/orders", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { name, phone, lessonSubjects, spaces, items } = req.body;

        // Basic validation
        if (!name || !phone || !Array.isArray(lessonSubjects) || lessonSubjects.length === 0) {
            return res.status(400).json({ error: "Invalid order data" });
        }

        // Insert the order into Orders collection
        const result = await db.collection("Orders").insertOne({
            name,
            phone,
            lessonSubjects,
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

// PUT /lessons/:subject → update a lesson using the subject name
app.put("/lessons/:subject", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const lessonSubject = req.params.subject;
        const updateData = req.body;

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No update data provided" });
        }

        // Update one lesson matching the subject
        const result = await db.collection("Lessons").updateOne(
            { subject: lessonSubject },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        res.json({
            message: "Lesson updated successfully",
            updatedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Error updating lesson:", error);
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
