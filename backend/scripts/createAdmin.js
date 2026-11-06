require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");

const User = require("../src/models/User");

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const createAdmin = async () => {
  try {
    const currentEmail = (
      await rl.question("Current admin email: ")
    ).trim().toLowerCase();

    const newEmail = (
      await rl.question("New admin email: ")
    ).trim().toLowerCase();

    const newPassword = await rl.question(
      "New admin password: "
    );

    if (!currentEmail || !newEmail || !newPassword) {
      throw new Error("All fields are required");
    }

    if (newPassword.length < 12) {
      throw new Error("Password must be at least 12 characters");
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");

    const admin = await User.findOne({
      email: currentEmail,
      role: "admin",
    });

    if (!admin) {
      throw new Error("Existing admin account not found");
    }

    const duplicate = await User.findOne({
      email: newEmail,
      _id: { $ne: admin._id },
    });

    if (duplicate) {
      throw new Error("This email is already registered");
    }

    admin.email = newEmail;
    admin.password = await bcrypt.hash(newPassword, 12);

    await admin.save();

    console.log("\nAdmin credentials updated successfully!");
    console.log("New email:", admin.email);
    console.log("Password: Securely updated");

  } catch (error) {
    console.error("\nAdmin update failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
};

createAdmin();