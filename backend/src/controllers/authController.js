const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      classId: user.classId || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* =====================================================
   EMAIL CONFIGURATION
===================================================== */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* =====================================================
   SIGNUP
===================================================== */

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classId: user.classId || null,
        profilePhoto:
          user.profilePhoto || "",
      },
    });
  } catch (error) {
    console.error(
      "Signup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during signup",
    });
  }
};

/* =====================================================
   LOGIN
===================================================== */

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(
      "================================="
    );

    console.log(
      "LOGIN REQUEST RECEIVED"
    );

    console.log(
      "Email:",
      email
    );

    console.log(
      "Password received:",
      !!password
    );

    if (!email || !password) {
      console.log(
        "❌ Email or password missing"
      );

      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    console.log(
      "Normalized email:",
      normalizedEmail
    );

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    console.log(
      "User found:",
      !!user
    );

    if (!user) {
      console.log(
        "❌ USER NOT FOUND"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    console.log(
      "User classId from MongoDB:",
      user.classId
    );

    console.log(
      "User role:",
      user.role
    );

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    console.log(
      "Password match:",
      passwordMatch
    );

    if (!passwordMatch) {
      console.log(
        "❌ PASSWORD DOES NOT MATCH"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    console.log(
      "✅ LOGIN SUCCESS:",
      user.email
    );

    console.log(
      "Class ID:",
      user.classId
    );

    const token =
      generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

        // IMPORTANT
        classId:
          user.classId !== null &&
          user.classId !== undefined
            ? Number(user.classId)
            : null,

        profilePhoto:
          user.profilePhoto || "",
      },
    });
  } catch (error) {
    console.error(
      "❌ Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during login",
    });
  }
};

/* =====================================================
   FORGOT PASSWORD
===================================================== */

const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    /*
      Generic response prevents revealing
      whether an email exists.
    */

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(
      100000 +
        Math.random() * 900000
    ).toString();

    // OTP valid for 10 minutes
    const otpExpiry = new Date(
      Date.now() +
        10 * 60 * 1000
    );

    user.resetPasswordOTP =
      otp;

    user.resetPasswordOTPExpires =
      otpExpiry;

    await user.save();

    await transporter.sendMail({
      from: `"The Winner Ramanujan Classes" <${process.env.EMAIL_USER}>`,

      to: user.email,

      subject:
        "The Winner Ramanujan Classes - Password Reset OTP",

      text: `Your The Winner Ramanujan Classes password reset OTP is ${otp}. This OTP is valid for 10 minutes.`,

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>The Winner Ramanujan Classes</h2>

          <p>
            Your password reset OTP is:
          </p>

          <h1
            style="
              letter-spacing: 6px;
              font-size: 32px;
            "
          >
            ${otp}
          </h1>

          <p>
            This OTP is valid for
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not request a password
            reset, please ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a verification code has been sent.",
    });
  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while sending OTP",
    });
  }
};

/* =====================================================
   VERIFY RESET OTP
===================================================== */

const verifyResetOTP = async (
  req,
  res
) => {
  try {
    const {
      email,
      otp,
    } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    if (
      !user.resetPasswordOTP ||
      !user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    if (
      user.resetPasswordOTP !==
      otp.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      new Date() >
      user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",
    });
  } catch (error) {
    console.error(
      "Verify OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while verifying OTP",
    });
  }
};

/* =====================================================
   RESET PASSWORD
===================================================== */

const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (
      !email ||
      !otp ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    if (
      !user.resetPasswordOTP ||
      !user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    if (
      user.resetPasswordOTP !==
      otp.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      new Date() >
      user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.resetPasswordOTP =
      null;

    user.resetPasswordOTPExpires =
      null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  signup,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};