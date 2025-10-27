import mongoose from "mongoose";
import Business from "../models/business.model.js";
import User from "../models/user.model.js";
import { VERIFICATION_STATUS } from "../utils/constants.js";

export const createBusiness = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      completeAddress,
      city,
      state,
      images,
      price,
      businessPhone,
      phone,
      userId,
      societyId,
    } = req.body;

    const newBusiness = new Business({
      title,
      category,
      description,
      completeAddress,
      city,
      state,
      images,
      price,
      businessPhone,
      phone,
      userId,
      societyId,
    });

    await newBusiness.save();

    res.status(201).json({
      success: true,
      code: res.statusCode,
      message: "Business created successfully",
      business: await newBusiness.populate({
        path: "userId",
      }),
    });
  } catch (error) {
    console.error("Error in createBusiness:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Validation Error",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error creating business",
    });
  }
};

/**
 * Update business by ID
 * @route PUT /api/business/:businessId
 */
export const updateBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const updates = req.body;

    // Define fields that are NOT allowed to be updated
    const notAllowedUpdates = ["_id", "createdAt", "updatedAt", "userId"];

    // Remove not allowed fields from updates
    const updateData = Object.keys(updates)
      .filter((key) => !notAllowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "No valid fields to update",
      });
    }

    const business = await Business.findByIdAndUpdate(businessId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run validation on update
    }).lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Business not found",
      });
    }

    res.json({
      success: true,
      code: res.statusCode,
      message: "Business updated successfully",
      business,
    });
  } catch (error) {
    console.error("Error in updateBusiness:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Validation Error",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Invalid business ID format",
      });
    }

    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error updating business",
    });
  }
};

/**
 * Get all businesses
 * @route GET /api/business
 */
export const getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().lean();
    const pendingReq = await Business.countDocuments({
      "verificationStatus.status": "pending",
    });
    const formatted = businesses.map((business) => ({
      ...business,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    }));
    res.json({
      success: true,
      code: res.statusCode,
      businesses: formatted,
      pendingReq,
      totalCount: businesses.length,
    });
  } catch (error) {
    console.error("Error in getAllBusinesses:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching businesses",
    });
  }
};

export const fetchBusinessBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    const sid = mongoose.isValidObjectId(societyId)
      ? new mongoose.Types.ObjectId(societyId)
      : societyId;

    // Only fetch approved businesses for this society
    const filter = {
      societyId: sid,
      "verificationStatus.status": VERIFICATION_STATUS.APPROVED,
    };
    const businesses = await Business.find(filter)
      .populate("userId", "fullName phone profilePhotoUrl")
      .lean();

    res.json({
      success: true,
      code: res.statusCode,
      businesses,
      totalCount: businesses.length,
    });
  } catch (error) {
    console.error("Error in fetchBusinessBySocietyId:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching businesses by societyId",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      code: res.statusCode,
      product,
    });
  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching product",
    });
  }
};
