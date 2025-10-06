import mongoose from "mongoose";
import Request from "../models/request.model.js";
import User from "../models/user.model.js";
import Business from "../models/business.model.js";

export const createUser = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNumber,
      tower,
    } = req.body;

    // Use static method from model
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(404).json({
        message: "User already exists",
      });
    }

    const newUser = new User({
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNumber,
      tower,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      newUser: await newUser.populate({
        path: "societyId",
        select: "-towers -totalFlats",
      }),
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
    const updates = { ...req.body };
    if (updates.societyId) {
      if (mongoose.Types.ObjectId.isValid(updates.societyId)) {
        updates.societyId = new mongoose.Types.ObjectId(updates.societyId);
      } else {
        return res.status(400).json({ message: "Invalid societyId format" });
      }
    }
    if (updates.businessId) {
      if (mongoose.Types.ObjectId.isValid(updates.businessId)) {
        updates.businessId = new mongoose.Types.ObjectId(updates.businessId);
      } else {
        return res.status(400).json({ message: "Invalid businessId format" });
      }
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).populate({ path: "societyId", select: "-towers -totalFlats" });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "failure",
        code: res.statusCode,
      });
    }

    return res
      .status(200)
      .json({ user, status: "success", code: res.statusCode });
  } catch (err) {
    console.error("Update user error:", err);
    return res
      .status(400)
      .json({ message: err.message, status: "failure", code: res.statusCode });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate({
      path: "societyId",
      select: "-towers -totalFlats",
    });
    // .populate({ path: "businessId" });

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

/**
 * Sync user's businessIds array with all businesses where userId matches
 * @route PUT /api/user/:userId/sync-business-ids
 */
export const syncUserBusinessIds = async (req, res) => {
  try {
    const { userId } = req.params;
    // Find all businesses for this user
    const businesses = await Business.find({ userId }).select("_id");
    const businessIds = businesses.map((b) => b._id);
    // Update user's businessIds array
    const user = await User.findByIdAndUpdate(
      userId,
      { businessIds },
      { new: true, runValidators: true }
    ).populate({
      path: "societyId",
      select: "-towers -totalFlats",
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "User not found",
      });
    }
    res.json({
      success: true,
      code: res.statusCode,
      message: "User's businessIds synced successfully",
      user,
    });
  } catch (error) {
    console.error("Error in syncUserBusinessIds:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error syncing businessIds",
    });
  }
};
