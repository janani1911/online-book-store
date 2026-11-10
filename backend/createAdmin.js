
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const username = "jaanus";
    const password = "ramjaanu";

    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      console.log("Admin account already exists!");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = new Admin({
      username,
      passwordHash
    });

    await admin.save();

    console.log("Admin account created successfully!");
    console.log("Username: jaanus");

  } catch (error) {
    console.log("Admin creation error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
