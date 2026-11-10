// Creates an admin account, or resets the password of an existing one.
// Usage:  npm run create-admin -- <username> <password>
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("../models/Admin");

async function main() {
    const [username, password] = process.argv.slice(2);

    if (!username || !password) {
        console.log("Usage: npm run create-admin -- <username> <password>");
        process.exit(1);
    }

    if (password.length < 8) {
        console.log("Password must be at least 8 characters.");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await Admin.findOne({ username: username.toLowerCase() });

    if (existing) {
        existing.passwordHash = passwordHash;
        await existing.save();
        console.log(`Password updated for admin "${existing.username}".`);
    } else {
        const admin = await Admin.create({ username, passwordHash });
        console.log(`Admin "${admin.username}" created.`);
    }

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.log("Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
});
