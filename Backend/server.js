
import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import { globalLimiter, trustProxyEnabled } from "./middleware/rateLimit.js";

const app = express();
const PORT = process.env.PORT || 8080;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

//lets rate limiting key on the real client IP when a reverse proxy sits in
//front of the app (Render, Railway, Nginx…). Never trust every hop (`true`).
app.set("trust proxy", trustProxyEnabled ? 1 : false);

//no server fingerprinting
app.disable("x-powered-by");

// Middleware
app.use(
    helmet({
        //the SPA is served from another origin (Vite dev server or static
        //host), so cross-origin reads of API responses must stay allowed
        crossOriginResourcePolicy: { policy: "cross-origin" },
        //HSTS only means something over HTTPS and would otherwise be sent by
        //a plain-http localhost server
        strictTransportSecurity: IS_PRODUCTION,
    })
);

app.use(
    cors({
        origin: FRONTEND_URL,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400,
    })
);

//oversized bodies are rejected by body-parser before any handler runs
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

//overall request ceiling, applied before any route
app.use("/api", globalLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);

// Test route
app.get("/api/ping", (req, res) => {
    res.status(200).send("pong");
});

//unknown routes answer JSON, never an HTML error page
app.use((req, res) => {
    res.status(404).json({ error: "Route not found." });
});

//last middleware: keeps internal error details out of the response body
app.use((err, req, res, next) => {
    if (err.type === "entity.too.large") {
        return res.status(413).json({ error: "Request body is too large." });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON body." });
    }

    console.error("Unhandled error:", err);

    res.status(500).json({
        error: "Something went wrong. Please try again.",
    });
});

// Connect to MongoDB
const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing in Backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected with Database!");
};

// Refuse to boot with a configuration that would silently disable a protection
const assertEnv = () => {
    if (IS_PRODUCTION && !process.env.FRONTEND_URL) {
        throw new Error(
            "FRONTEND_URL must be set in production so CORS stays locked to the real frontend origin."
        );
    }
};

// Start server after database connection
const startServer = async () => {
    try {
        assertEnv();
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
