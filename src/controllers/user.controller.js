import mongoose from "mongoose";
import Request from "../models/request.model.js";
import User from "../models/user.model.js";
import Business from "../models/business.model.js";
import Feed from "../models/feed.model.js";
import { VERIFICATION_STATUS } from "../utils/constants.js";

export const createUser = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNo,
      tower,
      email,
      isAddressVerified,
    } = req.body;

    // Use static method from model
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(404).json({
        message: "User already exists",
        userId: existingUser._id,
      });
    }

    // Sanitize email: convert empty or whitespace-only strings to undefined
    const sanitizedEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : undefined;

    const newUser = new User({
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNo,
      tower,
      isAddressVerified,
      ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      // userId: newUser._id,
      newUser: await newUser.populate({
        path: "societyId",
        select: "-towers -totalFlats",
      }),
      code: res.statusCode,
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

export const getAllUserBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    // Only return users with 'business' or 'resident' in roles and matching societyId
    const query = {
      roles: { $in: ["business", "resident"] },
    };
    if (societyId) {
      query.societyId = societyId;
    }
    const users = await User.find(query).populate({
      path: "societyId",
      select: "-totalFlats -totalResidents",
    });
    res.json({
      success: true,
      code: res.statusCode,
      users,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
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
    // Sanitize email in updates: remove empty/whitespace-only email to avoid duplicate empty-string index errors
    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      if (typeof updates.email === "string") {
        const trimmed = updates.email.trim();
        if (!trimmed) {
          delete updates.email;
        } else {
          updates.email = trimmed.toLowerCase();
        }
      } else {
        delete updates.email;
      }
    }
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
      { new: true, runValidators: true },
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

export const syncUserBusinessIdsWithStatus = async (req, res) => {
  try {
    console.log("Syncing user business IDs with status...");
    const { userId } = req.params;
    // Find all businesses for this user, select _id and verificationStatus
    const businesses = await Business.find({ userId })
      .select("_id verificationStatus.status")
      .lean();
    // Map to array of objects { id, verificationStatus } and ensure uniqueness by id
    const seen = new Set();
    const businessIds = [];
    for (const b of businesses) {
      if (!seen.has(String(b._id))) {
        businessIds.push({
          id: b._id,
          verificationStatus: b.verificationStatus?.status || null,
        });
        seen.add(String(b._id));
      }
    }
    // Update user's businessIds array
    const user = await User.findByIdAndUpdate(
      userId,
      { businessIds },
      { new: true, runValidators: true },
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
      message: "User's businessIds with status synced successfully",
      user,
    });
  } catch (error) {
    console.error("Error in syncUserBusinessIdsWithStatus:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error syncing businessIds with status",
    });
  }
};

export const getPendingUsersBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    const query = {
      roles: { $in: ["resident"] },
    };
    if (!societyId) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "societyId is required",
      });
    }
    const users = await User.find({
      ...query,
      societyId,
      "isAddressVerified.status": VERIFICATION_STATUS.PENDING,
    }).populate({
      path: "societyId",
      select: "-towers -totalFlats -totalResidents",
    });
    res.json({
      success: true,
      code: res.statusCode,
      users,
    });
  } catch (error) {
    console.error("Error in getPendingUsersBySocietyId:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching pending users",
    });
  }
};

// Remove a user by userId
export const removeUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // First, delete all feeds created by the user
    const feedDeleteResult = await Feed.deleteMany({ user: userId });
    console.log(
      `Deleted ${feedDeleteResult.deletedCount} feeds for user ${userId}`,
    );

    // Then, delete the user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User removed successfully",
      feedsDeleted: feedDeleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Error in removeUser:", error);
    res.status(500).json({ success: false, message: "Error removing user" });
  }
};

// Fetch logged-in user's orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
        code: res.statusCode,
      });
    }

    const user = await User.findById(userId).select("orders").lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: res.statusCode,
      });
    }

    // Populate sourceId references based on sourceType
    const ordersWithDetails = await Promise.all(
      user.orders.map(async (order) => {
        try {
          if (order.sourceType === "business") {
            const business = await Business.findById(order.sourceId)
              .select("title category profilePhotoUrl price")
              .lean();
            return {
              ...order,
              source: business,
            };
          } else if (order.sourceType === "wholesale") {
            const wholesaleDeal = await mongoose
              .model("WholesaleDeal")
              .findById(order.sourceId)
              .select("title price quantity")
              .lean();
            return {
              ...order,
              source: wholesaleDeal,
            };
          } else if (order.sourceType === "event") {
            const feed = await mongoose
              .model("Feed")
              .findById(order.sourceId)
              .select("title eventDate eventTime price")
              .lean();
            return {
              ...order,
              source: feed,
            };
          }
          return order;
        } catch (err) {
          console.error(`Error populating order ${order._id}:`, err);
          return order;
        }
      }),
    );

    res.status(200).json({
      success: true,
      orders: ordersWithDetails,
      totalOrders: ordersWithDetails.length,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in getUserOrders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user orders",
      code: res.statusCode,
    });
  }
};

// Report a user
export const reportUser = async (req, res) => {
  try {
    const { userId: reportedUserId } = req.params;
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: "userId and reason are required",
        code: res.statusCode,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportedUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId in params",
        code: res.statusCode,
      });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: res.statusCode,
      });
    }

    const reporterObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingReport = reportedUser.report.find(
      (report) => report.userId.toString() === reporterObjectIdStr,
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this user",
        code: res.statusCode,
      });
    }

    reportedUser.report.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      createdAt: new Date(),
    });

    reportedUser.totalReportCount += 1;

    await reportedUser.save();

    res.status(200).json({
      success: true,
      message: "User reported successfully",
      totalReportCount: reportedUser.totalReportCount,
      reports: reportedUser.report,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in reportUser:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};
