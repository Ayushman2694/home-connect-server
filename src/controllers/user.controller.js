import Request from "../models/request.model.js";
import User, { USER_ROLES, VERIFICATION_STATUS } from "../models/user.model.js";
import { Society } from "../models/society.model.js";

// Helper function to format user response
const formatUserResponse = (user) => ({
  success: true,
  user: {
    residentInfo: {
      emergency_contacts: user.residentInfo?.emergency_contacts || [],
      flat_number: user.residentInfo?.flat_number || "",
      building: user.residentInfo?.building || "",
      ...user.residentInfo,
    },
    _id: user._id,
    fullName: user.fullName || "",
    phone: user.phone,
    selectedSocietyId: user.selectedSocietyId,
    roles: user.roles,
    isAddress_verified: user.isAddress_verified || VERIFICATION_STATUS.PENDING,
    verifyStatus: user.verifyStatus || VERIFICATION_STATUS.PENDING,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    __v: user.__v,
  },
});

export const createUser = async (req, res) => {
  try {
    const {
      name: fullName,
      phone,
      roles,
      profilePhotoUrl,
      residentInfo,
      businessInfo,
    } = req.body;

    // Use static method from model
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      return res.status(200).json({
        message: "User already exists",
        ...formatUserResponse(existingUser),
      });
    }

    const newUser = new User({
      fullName,
      phone,
      roles: roles?.length ? roles : [USER_ROLES.GUEST],
      profilePhotoUrl,
      residentInfo,
      businessInfo,
      isAddress_verified: VERIFICATION_STATUS.PENDING,
      verifyStatus: VERIFICATION_STATUS.PENDING,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      ...formatUserResponse(newUser),
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
    const users = await User.find({}).select("_id phone fullName roles").lean();

    res.json({
      success: true,
      users: users.map((user) => ({
        id: String(user._id),
        phone: user.phone,
        fullName: user.fullName || "",
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

    // 🔒 Define allowed fields (flat + nested)
    const allowedFields = [
      "fullName",
      "profilePhotoUrl",
      "isAddress_verified",
      "verifyStatus",
      "roles",
      "selectedSocietyId",
      "selectedSociety.name",
      "selectedSociety.towerName",
      "selectedSociety.flatNumber",
      "selectedSociety.pincode",
      "selectedSociety.completeAddress",
      "selectedSociety.city",
      "selectedSociety.state",
      // Resident-specific
      "residentInfo",
      "residentInfo.emergency_contacts",
      // Business-specific
      "businessInfo.business_name",
      "businessInfo.category",
      "businessInfo.description",
      "businessInfo.website",
      "businessInfo.location",
      "businessInfo.gst_number",
    ];

    const updateData = {};

    // Handle selectedSocietyId and resident info updates
    if (updates.selectedSocietyId) {
      const society = await Society.findById(updates.selectedSocietyId);
      if (!society) {
        return res.status(404).json({ error: "Society not found" });
      }
      updateData.selectedSocietyId = updates.selectedSocietyId;
    }

    // Handle resident info updates
    const existingUser = await User.findById(userId);

    if (!updateData.selectedSociety) {
      updateData.selectedSociety = {
        ...(existingUser?.selectedSociety || {}),
        id: existingUser?.selectedSociety?.id || null,
        name: existingUser?.selectedSociety?.name || "",
        towerName: existingUser?.selectedSociety?.towerName || "",
        flatNumber: existingUser?.selectedSociety?.flatNumber || "",
        pincode: existingUser?.selectedSociety?.pincode || "",
        completeAddress: existingUser?.selectedSociety?.completeAddress || "",
        city: existingUser?.selectedSociety?.city || "",
        state: existingUser?.selectedSociety?.state || "",
      };
    }

    // If selectedSociety is provided in updates, merge it
    if (updates.selectedSociety) {
      updateData.selectedSociety = {
        ...updateData.selectedSociety,
        ...updates.selectedSociety,
      };
    }

    // Handle other allowed fields
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        select:
          "residentInfo fullName phone selectedSociety selectedSocietyId roles isAddress_verified verifyStatus createdAt updatedAt",
      }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        selectedSociety: {
          id: user.selectedSociety?.id || null,
          name: user.selectedSociety?.name || "",
          towerName: user.selectedSociety?.towerName || "",
          flatNumber: user.selectedSociety?.flatNumber || "",
          pincode: user.selectedSociety?.pincode || "",
          completeAddress: user.selectedSociety?.completeAddress || "",
          city: user.selectedSociety?.city || "",
          state: user.selectedSociety?.state || "",
        },
        _id: user._id,
        fullName: user.fullName || "",
        phone: user.phone,
        selectedSocietyId: user.selectedSocietyId,
        roles: user.roles,
        isAddress_verified: user.isAddress_verified || "pending",
        verifyStatus: user.verifyStatus || "pending",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        __v: user.__v,
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.json(formatUserResponse(user));
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
