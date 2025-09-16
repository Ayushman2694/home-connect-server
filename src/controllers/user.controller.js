import Request from "../models/request.model.js";
import User, { VERIFICATION_STATUS, USER_ROLES } from "../models/user.model.js";
import { Society } from "../models/society.model.js";

export const createUser = async (req, res) => {
  try {
    const { name: fullName, phone, roles, profilePhotoUrl } = req.body;

    // Use static method from model
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(200).json({
        message: "User already exists",
      });
    }

    const newUser = new User({
      fullName,
      phone,
      roles,
      profilePhotoUrl,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      newUser,
    });
  } catch (error) {
    console.error("Error in create user controller:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.json({
      success: true,
      users: users.map((user) => ({
        id: String(user._id),
        phone: user.phone,
        fullName: user.fullName,
        roles: user.roles,
      })),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching users",
    });
  }
};

export const getRequestByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await Request.find({ user: userId })
      .populate("user", "fullName phone roles")
      .lean();

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Error in getRequestByUserId:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching user requests",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).populate({ path: "societyId", select: "-towers -totalFlats" });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(400).json({ message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate({ path: "societyId", select: "-towers -totalFlats" })
      .populate({ path: "businessId" });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error in getUserById:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Error fetching user",
    });
  }
};
