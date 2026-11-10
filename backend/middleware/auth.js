const jwt = require("jsonwebtoken");

// Allows the request through only if it carries a valid admin token:
//   Authorization: Bearer <token>
function requireAdmin(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Admin login required" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

        if (payload.role !== "admin") {
            return res.status(403).json({ message: "Admin access only" });
        }

        req.admin = { id: payload.sub, username: payload.username };
        next();
    } catch {
        return res.status(401).json({ message: "Session expired. Please log in again." });
    }
}

// Very small in-memory limiter: max 5 failed logins per IP every 15 minutes.
const failedLogins = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function loginRateLimit(req, res, next) {
    const entry = failedLogins.get(req.ip);

    if (entry && Date.now() - entry.first < WINDOW_MS && entry.count >= MAX_ATTEMPTS) {
        const minutes = Math.ceil((WINDOW_MS - (Date.now() - entry.first)) / 60000);
        return res.status(429).json({
            message: `Too many failed attempts. Try again in ${minutes} minute(s).`
        });
    }
    next();
}

function recordFailedLogin(ip) {
    const entry = failedLogins.get(ip);
    if (!entry || Date.now() - entry.first >= WINDOW_MS) {
        failedLogins.set(ip, { first: Date.now(), count: 1 });
    } else {
        entry.count += 1;
    }
}

function clearFailedLogins(ip) {
    failedLogins.delete(ip);
}

module.exports = { requireAdmin, loginRateLimit, recordFailedLogin, clearFailedLogins };
