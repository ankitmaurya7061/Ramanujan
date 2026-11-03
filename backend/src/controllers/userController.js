const bcrypt = require("bcryptjs");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

// Get logged-in user
const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        classId: req.user.classId || null,
        profilePhoto: req.user.profilePhoto || "",
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Current User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
};

// Update logged-in user's profile
const updateCurrentUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: trimmedEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already in use",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.name = trimmedName;
    user.email = trimmedEmail;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classId: user.classId || null,
        profilePhoto: user.profilePhoto || "",
      },
    });
  } catch (error) {
    console.error("Update User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Profile Photo
|--------------------------------------------------------------------------
*/

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile photo file is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete old locally stored profile photo
    |--------------------------------------------------------------------------
    */

    if (user.profilePhoto) {
      try {
        const oldPhotoUrl = user.profilePhoto;

        const uploadsMarker = "/uploads/";

        const uploadsIndex =
          oldPhotoUrl.indexOf(uploadsMarker);

        if (uploadsIndex !== -1) {
          const relativePath =
            oldPhotoUrl.substring(
              uploadsIndex + uploadsMarker.length
            );

          const oldPhotoPath = path.join(
            __dirname,
            "../../uploads",
            relativePath
          );

          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        }
      } catch (deleteError) {
        console.error(
          "Old profile photo delete error:",
          deleteError
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create accessible image URL
    |--------------------------------------------------------------------------
    */

    const baseUrl =
      `${req.protocol}://${req.get("host")}`;

    const profilePhotoUrl =
      `${baseUrl}/uploads/profile/${req.file.filename}`;

    /*
    |--------------------------------------------------------------------------
    | Save photo URL in MongoDB
    |--------------------------------------------------------------------------
    */

    user.profilePhoto = profilePhotoUrl;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classId: user.classId || null,
        profilePhoto: user.profilePhoto || "",
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Delete uploaded file if database operation fails
    |--------------------------------------------------------------------------
    */

    if (
      req.file &&
      req.file.path &&
      fs.existsSync(req.file.path)
    ) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (fileError) {
        console.error(
          "Uploaded file cleanup error:",
          fileError
        );
      }
    }

    console.error(
      "Update Profile Photo Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile photo",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Remove Profile Photo
|--------------------------------------------------------------------------
*/

const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete stored image file
    |--------------------------------------------------------------------------
    */

    if (user.profilePhoto) {
      try {
        const oldPhotoUrl = user.profilePhoto;

        const uploadsMarker = "/uploads/";

        const uploadsIndex =
          oldPhotoUrl.indexOf(uploadsMarker);

        if (uploadsIndex !== -1) {
          const relativePath =
            oldPhotoUrl.substring(
              uploadsIndex + uploadsMarker.length
            );

          const oldPhotoPath = path.join(
            __dirname,
            "../../uploads",
            relativePath
          );

          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        }
      } catch (deleteError) {
        console.error(
          "Profile photo file delete error:",
          deleteError
        );
      }
    }

    user.profilePhoto = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo removed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classId: user.classId || null,
        profilePhoto: "",
      },
    });
  } catch (error) {
    console.error(
      "Remove Profile Photo Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while removing profile photo",
    });
  }
};

// Get all users - Admin only
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Get All Users Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};

// Delete user - Admin only
const deleteUser = async (req, res) => {
  try {
    const email =
      req.params.email.trim().toLowerCase();

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin users cannot be deleted",
      });
    }

    await User.deleteOne({
      _id: user._id,
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete User Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while deleting user",
    });
  }
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  updateProfilePhoto,
  removeProfilePhoto,
  getAllUsers,
  deleteUser,
};