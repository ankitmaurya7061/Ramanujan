const jwt = require("jsonwebtoken");

const feeAdminOnly = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Fee Admin authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.feeAdmin) {
      return res.status(403).json({
        success: false,
        message: "Fee Admin access required",
      });
    }

    req.feeAdmin = decoded;

    next();
  } catch (error) {
    console.error("Fee Admin Middleware Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired Fee Admin token",
    });
  }
};

module.exports = feeAdminOnly;