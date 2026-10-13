
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
};

function createSession(res, user) {
    const token = jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("sigma_token", token, cookieOptions);
}

function publicUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
    };
}

// SIGNUP — rate limited: an account is not known yet, so the key is the IP
router.post("/signup", authLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                error: "Please provide name, email and password.",
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName || cleanName.length > 80) {
            return res.status(400).json({
                error: "Name must be between 1 and 80 characters.",
            });
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                error: "Enter a valid email address.",
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                error: "Password must be 8–72 characters long.",
            });
        }

        const existingUser = await User.findOne({
            email: cleanEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                error: "An account with this email already exists.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
        });

        createSession(res, user);

        return res.status(201).json({
            user: publicUser(user),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: "An account with this email already exists.",
            });
        }

        console.error("Signup error:", error.message);

        return res.status(500).json({
            error: "Unable to create account.",
        });
    }
});

// LOGIN — rate limited to slow down credential stuffing
router.post("/login", authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: "Enter your email and password.",
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select("+password");

        if (
            !user ||
            !(await bcrypt.compare(password, user.password))
        ) {
            return res.status(401).json({
                error: "Invalid email or password.",
            });
        }

        createSession(res, user);

        return res.json({
            user: publicUser(user),
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            error: "Unable to log in.",
        });
    }
});

// CHECK CURRENT SESSION
router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            res.clearCookie("sigma_token", cookieOptions);

            return res.status(401).json({
                error: "Account not found.",
            });
        }

        return res.json({
            user: publicUser(user),
        });
    } catch {
        return res.status(500).json({
            error: "Unable to check session.",
        });
    }
});

// LOGOUT
router.post("/logout", (req, res) => {
    res.clearCookie("sigma_token", cookieOptions);

    return res.json({
        message: "Logged out successfully.",
    });
});

export default router;
