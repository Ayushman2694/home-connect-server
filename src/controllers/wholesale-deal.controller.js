import WholesaleDeal from "../models/wholesale-deal.model.js";
import { VERIFICATION_STATUS, DEAL_STATUS } from "../utils/constants.js";

export const createWholesaleDeal = async (req, res) => {
  try {
    const {
      title,
      phone,
      images,
      description,
      quantityAvailable,
      quantityUnit,
      minimumOrderQty,
      maximumOrderQty,
      currentOrderedQty,
      price,
      category,
      orderDeadlineDate,
      estimatedDeliveryDate,
      dealOptions,
      isDealActive,
      userId,
      dealStatus,
      orders,
      societyId,
      verificationStatus,
    } = req.body;

    // ✅ Create deal
    const deal = await WholesaleDeal.create({
      title,
      phone,
      images,
      description,
      quantityAvailable,
      quantityUnit,
      minimumOrderQty,
      maximumOrderQty,
      currentOrderedQty,
      price,
      category,
      orderDeadlineDate,
      estimatedDeliveryDate,
      dealOptions,
      isDealActive,
      userId,
      dealStatus,
      orders,
      societyId,
      verificationStatus,
    });

    res.status(201).json({
      success: true,
      code: res.statusCode,
      deal,
    });
  } catch (error) {
    console.error("Error creating deal:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};

export const getAllDealsBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    const deals = await WholesaleDeal.find({ societyId }).populate(
      "userId",
      "fullName phone profilePhotoUrl"
    );
    const pendingReq = await WholesaleDeal.countDocuments({ societyId });
    res.status(200).json({
      success: true,
      code: res.statusCode,
      deals,
      pendingReq,
      activeDeals: deals.filter((deal) => deal.isDealActive).length,
      totalCount: deals.length,
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};

export const updateDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const updates = req.body;

    // Define fields that are NOT allowed to be updated
    const notAllowedUpdates = [
      "_id",
      "createdAt",
      "updatedAt",
      "userId",
      "societyId",
    ];

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

    const deal = await WholesaleDeal.findByIdAndUpdate(dealId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run validation on update
    }).lean();

    if (!deal) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Deal not found",
      });
    }

    res.json({
      success: true,
      code: res.statusCode,
      deal,
    });
  } catch (error) {
    console.error("Error in updateDeal:", error);

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
        error: "Invalid deal ID format",
      });
    }

    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error updating deal",
    });
  }
};

export const removeDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const deal = await WholesaleDeal.findByIdAndDelete(dealId);
    if (!deal) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Deal not found",
      });
    }
    // Remove dealId from the user's dealIds array
    if (deal.userId) {
      await User.findByIdAndUpdate(deal.userId, {
        $pull: { dealIds: dealId },
      });
    }
    res.json({
      success: true,
      code: res.statusCode,
      message: "Deal deleted successfully and removed from user's dealIds.",
    });
  } catch (error) {
    console.error("Error in deleteDeal:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Invalid deal ID format",
      });
    }
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error deleting deal",
    });
  }
};

export const updateExpiredDeals = async (req, res) => {
  try {
    const { societyId } = req.params;

    // Get current date and normalize to YYYY-MM-DD format for string comparison
    const today = new Date().toISOString().split("T")[0]; // Will give "2025-10-13"
    // Update the deals
    const result = await WholesaleDeal.updateMany(
      {
        societyId,
        orderDeadlineDate: { $lt: today }, // Only strict less than
      },
      {
        $set: {
          isDealActive: true,
          dealStatus: DEAL_STATUS.EXPIRED,
          verificationStatus: { status: VERIFICATION_STATUS.REJECTED },
        },
      }
    );

    res.status(200).json({
      success: true,
      code: res.statusCode,
      message: "Expired deals updated successfully",
    });
  } catch (error) {
    console.error("Error updating expired deals:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};

export const getDealById = async (req, res) => {
  try {
    const { dealId } = req.params;
    const deal = await WholesaleDeal.findOne({
      _id: dealId,
    }).populate("userId", "fullName phone profilePhotoUrl");

    if (!deal) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Deal not found or not approved",
      });
    }

    res.status(200).json({
      success: true,
      code: res.statusCode,
      deal,
    });
  } catch (error) {
    console.error("Error fetching deal:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};

// Get all deals by userId
export const getDealsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const deals = await WholesaleDeal.find({ userId })
      .populate("userId", "fullName phone profilePhotoUrl")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, code: res.statusCode, deals });
  } catch (error) {
    console.error("Error fetching deals by userId:", error);
    res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
  }
};
