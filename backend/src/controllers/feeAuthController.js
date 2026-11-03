const jwt = require("jsonwebtoken");

const feeAdminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const validUsername =
      process.env.FEE_ADMIN_USERNAME;

    const validPassword =
      process.env.FEE_ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
      console.error(
        "Fee Admin credentials are missing in .env"
      );

      return res.status(500).json({
        success: false,
        message: "Fee admin login is not configured",
      });
    }

    if (
      username.trim().toLowerCase() !==
        validUsername.trim().toLowerCase() ||
      password !== validPassword
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid fee admin credentials",
      });
    }

    const token = jwt.sign(
      {
        feeAdmin: true,
        username: validUsername,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30m",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Fee admin login successful",
      token,
    });
  } catch (error) {
    console.error("Fee Admin Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during fee admin login",
    });
  }
};

module.exports = {
  feeAdminLogin,
};