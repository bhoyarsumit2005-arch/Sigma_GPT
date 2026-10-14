import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { clearSessionCookie } from "../utils/cookies.js";

//Verifies the JWT *and* that its session id still exists on the account.
//That database check is what makes per-device logout and "log out all devices"
//real rather than cosmetic.
async function requireAuth(req, res, next) {
    const token = req.cookies?.sigma_token;

    if (!token) {
        return res.status(401).json({
            error: "Please log in first.",
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        clearSessionCookie(res);

        return res.status(401).json({
            error: "Session expired. Please log in again.",
        });
    }

    //tokens minted before session tracking have no `sid` and cannot be trusted
    if (!decoded?.userId || !decoded?.sid) {
        clearSessionCookie(res);

        return res.status(401).json({
            error: "Session expired. Please log in again.",
        });
    }

    try {
        const user = await User.findById(decoded.userId).select("+sessions");

        const isActive = user?.sessions?.some(
            (session) => session.sid === decoded.sid
        );

        if (!isActive) {
            clearSessionCookie(res);

            return res.status(401).json({
                error: "Session expired. Please log in again.",
            });
        }

        //identified from the verified token only — never from the request body
        req.user = { id: user._id.toString(), sid: decoded.sid };
        req.account = user;

        return next();
    } catch (error) {
        console.error("Session verification failed:", error.message);

        return res.status(500).json({
            error: "Unable to verify your session.",
        });
    }
}

export default requireAuth;
