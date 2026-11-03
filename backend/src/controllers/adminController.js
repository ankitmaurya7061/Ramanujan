const bcrypt = require("bcryptjs");
const User = require("../models/User");

const getAdminDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Admin access granted",
      admin: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading admin dashboard",
    });
  }
};

// Create Student - Admin Only
const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      classId,
    } = req.body;

    // Required fields
    if (!name || !email || !password || !classId) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and class are required",
      });
    }

    // Validate class
    const allowedClasses = [6, 7, 8, 9, 10, 11, 12];
    const studentClass = Number(classId);

    if (!allowedClasses.includes(studentClass)) {
      return res.status(400).json({
        success: false,
        message: "Class must be between 6 and 12",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      classId: studentClass,
    });

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        classId: student.classId,
      },
    });
  } catch (error) {
    console.error("Create Student Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating student",
    });
  }
};

module.exports = {
  getAdminDashboard,
  createStudent,
};