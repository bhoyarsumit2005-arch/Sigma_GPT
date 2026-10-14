import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";
import Thread from "../models/Thread.js";
import requireAuth from "../middleware/requireAuth.js";
import { authLimiter, sensitiveLimiter } from "../middleware/rateLimit.js";
import {
    COOKIE_NAME,
    cookieOptions,
    clearSessionCookie,
} from "../utils/cookies.js";

const router = express.Router();

const MAX_SESSIONS = 10;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_THEMES = ["dark", "light", "system"];

//only ever send these fields to the client — never password, never sessions
function publicUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        theme: user.theme || "dark",
    };
}

//turns a stored user-agent into a short, honest label. If it cannot be parsed
//we say so instead of inventing a device name.
function describeDevice(userAgent) {
    const ua = String(userAgent || "");
    if (!ua) return "Unknown device";

    let browser = null;
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
    else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = "Safari";

    let os = null;
    if (/Windows NT/i.test(ua)) os = "Windows";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Mac OS X/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    if (browser && os) return `${browser} on ${os}`;
    return browser || os || "Unknown device";
}

//Registers a new server-side session, signs a JWT that references it and sets
//the HTTP-only cookie.
async function createSession(res, user, req) {
    const sid = crypto.randomUUID();

    user.sessions = user.sessions || [];
    user.sessions.push({
        sid,
        userAgent: (req.get("user-agent") || "").slice(0, 400),
        ip: (req.ip || "").slice(0, 100),
    });

    //keep only the most recent sessions so the array cannot grow forever
    if (user.sessions.length > MAX_SESSIONS) {
        user.sessions = user.sessions.slice(-MAX_SESSIONS);
    }

    await user.save();

    const token = jwt.sign(
        { userId: user._id.toString(), sid },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie(COOKIE_NAME, token, cookieOptions);
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
            cleanEmail.length > 254 ||
            !EMAIL_PATTERN.test(cleanEmail)
        ) {
            return res.status(400).json({
                error: "Enter a valid email address.",
            });
        }

        if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
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

        await createSession(res, user, req);

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
        }).select("+password +sessions");

        if (
            !user ||
            !(await bcrypt.compare(password, user.password))
        ) {
            return res.status(401).json({
                error: "Invalid email or password.",
            });
        }

        await createSession(res, user, req);

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

// CHECK CURRENT SESSION — requireAuth already loaded and validated the account
router.get("/me", requireAuth, (req, res) => {
    return res.json({
        user: publicUser(req.account),
    });
});

// UPDATE PROFILE
// The account being edited always comes from the verified token (req.user.id),
// never from the request body, and only approved fields can be written.
router.patch("/profile", requireAuth, async (req, res) => {
    try {
        const body = req.body || {};
        const updates = {};

        if (body.name !== undefined) {
            if (typeof body.name !== "string") {
                return res.status(400).json({
                    error: "Name must be text.",
                });
            }

            const cleanName = body.name.trim();

            if (!cleanName || cleanName.length > 80) {
                return res.status(400).json({
                    error: "Name must be between 1 and 80 characters.",
                });
            }

            updates.name = cleanName;
        }

        if (body.email !== undefined) {
            if (typeof body.email !== "string") {
                return res.status(400).json({
                    error: "Email must be text.",
                });
            }

            const cleanEmail = body.email.trim().toLowerCase();

            if (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail)) {
                return res.status(400).json({
                    error: "Enter a valid email address.",
                });
            }

            updates.email = cleanEmail;
        }

        if (body.theme !== undefined) {
            if (
                typeof body.theme !== "string" ||
                !ALLOWED_THEMES.includes(body.theme)
            ) {
                return res.status(400).json({
                    error: "Invalid theme preference.",
                });
            }

            updates.theme = body.theme;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: "Nothing to update.",
            });
        }

        if (updates.email) {
            const taken = await User.findOne({
                email: updates.email,
                _id: { $ne: req.user.id },
            });

            if (taken) {
                return res.status(409).json({
                    error: "An account with this email already exists.",
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        );

        if (!user) {
            clearSessionCookie(res);

            return res.status(401).json({
                error: "Account not found.",
            });
        }

        return res.json({
            user: publicUser(user),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: "An account with this email already exists.",
            });
        }

        console.error("Profile update error:", error.message);

        return res.status(500).json({
            error: "Unable to update your profile.",
        });
    }
});

// CHANGE PASSWORD — verifies the current password, hashes the new one, and
// signs out every other device while keeping the current one logged in.
router.post("/change-password", requireAuth, sensitiveLimiter, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};

        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string"
        ) {
            return res.status(400).json({
                error: "Enter your current and new password.",
            });
        }

        const user = await User.findById(req.user.id).select(
            "+password +sessions"
        );

        if (!user) {
            clearSessionCookie(res);

            return res.status(401).json({
                error: "Account not found.",
            });
        }

        const matches = await bcrypt.compare(currentPassword, user.password);

        if (!matches) {
            return res.status(401).json({
                error: "Your current password is incorrect.",
            });
        }

        if (
            newPassword.length < PASSWORD_MIN ||
            newPassword.length > PASSWORD_MAX
        ) {
            return res.status(400).json({
                error: "Password must be 8–72 characters long.",
            });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                error: "Choose a password different from your current one.",
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        //drop every session except the one making this request
        user.sessions = (user.sessions || []).filter(
            (session) => session.sid === req.user.sid
        );

        await user.save();

        return res.json({
            message:
                "Password updated. All other devices have been signed out.",
        });
    } catch (error) {
        console.error("Change password error:", error.message);

        return res.status(500).json({
            error: "Unable to change your password.",
        });
    }
});

// ACTIVE SESSIONS — real data read from the stored session list
router.get("/sessions", requireAuth, (req, res) => {
    const sessions = (req.account.sessions || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((session) => ({
            device: describeDevice(session.userAgent),
            ip: session.ip || null,
            createdAt: session.createdAt,
            current: session.sid === req.user.sid,
        }));

    return res.json({ sessions });
});

// LOGOUT (current device) — best-effort: the cookie is always cleared even if
// the token is already invalid, and the matching session record is removed.
router.post("/logout", async (req, res) => {
    try {
        const token = req.cookies?.sigma_token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded?.userId && decoded?.sid) {
                await User.updateOne(
                    { _id: decoded.userId },
                    { $pull: { sessions: { sid: decoded.sid } } }
                );
            }
        }
    } catch {
        //an unreadable or already-revoked token needs no cleanup
    }

    clearSessionCookie(res);

    return res.json({
        message: "Logged out successfully.",
    });
});

// LOGOUT ALL DEVICES — clears the session list, which invalidates every token
router.post("/logout-all", requireAuth, async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.user.id },
            { $set: { sessions: [] } }
        );
    } catch (error) {
        console.error("Logout-all error:", error.message);

        return res.status(500).json({
            error: "Unable to sign out of all devices.",
        });
    }

    clearSessionCookie(res);

    return res.json({
        message: "Signed out of all devices.",
    });
});

// Removes the account and its conversations. Uses a transaction when the
// deployment supports it, otherwise a safe ordered delete.
async function deleteAccountData(userId) {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            await Thread.deleteMany({ userId }, { session });
            await User.deleteOne({ _id: userId }, { session });
        });

        return;
    } catch (error) {
        const transactionsUnsupported =
            /Transaction numbers are only allowed|replica set|mongos|Transaction.*not supported/i.test(
                error.message || ""
            );

        if (!transactionsUnsupported) {
            throw error;
        }

        console.warn(
            "Transactions unavailable, falling back to ordered deletion:",
            error.message
        );
    } finally {
        await session.endSession();
    }

    //Fallback policy: threads first, then the account. If the account delete
    //fails midway the conversations are already gone, and retrying is safe.
    await Thread.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
}

// DELETE ACCOUNT — requires the password again, then deletes the authenticated
// user and every conversation they own.
router.delete("/account", requireAuth, sensitiveLimiter, async (req, res) => {
    try {
        const { password } = req.body || {};

        if (typeof password !== "string" || !password) {
            return res.status(400).json({
                error: "Enter your password to confirm.",
            });
        }

        const user = await User.findById(req.user.id).select("+password");

        if (!user) {
            clearSessionCookie(res);

            return res.status(401).json({
                error: "Account not found.",
            });
        }

        const matches = await bcrypt.compare(password, user.password);

        if (!matches) {
            return res.status(401).json({
                error: "Your password is incorrect.",
            });
        }

        await deleteAccountData(req.user.id);

        clearSessionCookie(res);

        return res.json({
            message: "Your account and conversations have been deleted.",
        });
    } catch (error) {
        console.error("Account deletion error:", error.message);

        return res.status(500).json({
            error: "Unable to delete your account right now.",
        });
    }
});

export default router;
