const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../src/models/User");

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");

    const email = "admin@studypoint.com";
    const password = "admin123";

    const hashedPassword = await bcrypt.hash(password, 10);

    let admin = await User.findOne({ email });

    if (admin) {
      admin.name = "StudyPoint Admin";
      admin.password = hashedPassword;
      admin.role = "admin";

      await admin.save();

      console.log("Admin updated successfully");
    } else {
      admin = await User.create({
        name: "StudyPoint Admin",
        email,
        password: hashedPassword,
        role: "admin",
        profilePhoto: "",
      });

      console.log("Admin created successfully");
    }

    console.log("Email:", admin.email);
    console.log("Role:", admin.role);

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error("Admin creation failed:", error);
    process.exit(1);
  }
};

createAdmin();