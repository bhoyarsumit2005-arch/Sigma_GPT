
import jwt from "jsonwebtoken";

function requireAuth(req, res, next) {
    const token = req.cookies?.sigma_token;

    if (!token) {
        return res.status(401).json({
            error: "Please log in first.",
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = {
            id: decoded.userId,
        };

        next();
    } catch {
        return res.status(401).json({
            error: "Session expired. Please log in again.",
        });
    }
}

export default requireAuth;
