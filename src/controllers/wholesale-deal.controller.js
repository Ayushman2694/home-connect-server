import WholesaleDeal from "../models/wholesale-deal.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import {
  VERIFICATION_STATUS,
  WHOLESALE_DEAL_STATUS,
  USER_ROLES,
  NOTIFICATION_TYPES,
} from "../utils/constants.js";
import { getUserReportsToday } from "../utils/dailyReportLimit.js";
import Business from "../models/business.model.js";
import { logReport } from "../services/report.service.js";
import {
  createNotificationForMany,
  getSocietyUserIds,
} from "../services/notification.service.js";

export const createWholesaleDeal = async (req, res) => {
  try {
    const {
      title,
      postedBy,
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
      orders,
      societyId,
      verificationStatus,
    } = req.body;

    // ✅ Create deal
    // NOTE: `dealStatus` is intentionally NOT taken from the client. The model
    // default ("ACTIVE") and the pre("save") lifecycle hook set the correct
    // uppercase status. Accepting the client value caused validation failures
    // (the app sends lowercase "active", which isn't a valid enum member).
    let deal = await WholesaleDeal.create({
      title,
      postedBy,
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
      orders,
      societyId,
      verificationStatus,
    });

    deal = await WholesaleDeal.findById(deal._id)
      .populate("userId", "fullName phone profilePhotoUrl")
      .populate("orders.userId", "fullName phone profilePhotoUrl");

    if (societyId) {
      try {
        const societyUserIds = await getSocietyUserIds(societyId);
        await createNotificationForMany({
          title: "New Deal Added",
          message: `${deal.userId?.fullName || "Someone"} added a new wholesale deal: ${deal.title}`,
          notificationType: NOTIFICATION_TYPES.DEAL_CREATED,
          sender: userId,
          receivers: societyUserIds,
          metadata: { dealId: deal._id },
        });
      } catch (err) {
        console.error("Failed to notify society of new deal:", err);
      }
    }

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
    const deals = await WholesaleDeal.find({ societyId })
      .populate("userId", "fullName phone profilePhotoUrl")
      .populate("orders.userId", "fullName phone profilePhotoUrl");
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

    const deal = await WholesaleDeal.findById(dealId);

    if (!deal) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Deal not found",
      });
    }

    // Only the deal owner or an admin/super_admin may update a deal.
    const requesterRoles = req.user?.roles || [];
    const isModerator =
      requesterRoles.includes(USER_ROLES.ADMIN) ||
      requesterRoles.includes(USER_ROLES.SUPER_ADMIN);
    const isOwner = deal.userId && String(deal.userId) === String(req.userId);
    if (!isModerator && !isOwner) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: "You are not allowed to update this deal",
      });
    }

    // Apply updates
    Object.assign(deal, updateData);
    await deal.save();

    const populatedDeal = await WholesaleDeal.findById(deal._id)
      .populate("userId", "fullName phone profilePhotoUrl")
      .populate("orders.userId", "fullName phone profilePhotoUrl");

    res.json({
      success: true,
      code: res.statusCode,
      deal: populatedDeal,
    });

    const interestedUserIds = [...new Set(
      (deal.orders || [])
        .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
        .map((o) => String(o.userId)),
    )];
    if (interestedUserIds.length > 0) {
      try {
        await createNotificationForMany({
          title: `Deal Updated: ${deal.title}`,
          message: "A deal you ordered from has been updated.",
          notificationType: NOTIFICATION_TYPES.DEAL_UPDATED,
          sender: deal.userId,
          receivers: interestedUserIds,
          metadata: { dealId: deal._id },
        });
      } catch (err) {
        console.error("Failed to notify interested users of deal update:", err);
      }
    }
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
    const { reason } = req.body;

    // Only the deal owner or an admin / super_admin may cancel a deal.
    const existingDeal = await WholesaleDeal.findById(dealId).select("userId");
    if (!existingDeal) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: "Deal not found",
      });
    }

    const requesterRoles = req.user?.roles || [];
    const isModerator =
      requesterRoles.includes(USER_ROLES.ADMIN) ||
      requesterRoles.includes(USER_ROLES.SUPER_ADMIN);
    const isOwner =
      existingDeal.userId &&
      String(existingDeal.userId) === String(req.userId);

    if (!isModerator && !isOwner) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: "You are not allowed to cancel this deal",
      });
    }

    const deal = await WholesaleDeal.findByIdAndUpdate(
      dealId,
      {
        $set: {
          isDealActive: false,
          dealStatus: WHOLESALE_DEAL_STATUS.CANCELLED,
          "verificationStatus.status": VERIFICATION_STATUS.SUSPENDED,
          "verificationStatus.rejectionReason": reason ?? null,
          cancelledAt: new Date(),
          cancellationReason: reason ?? null,
        },
      },
      { new: true },
    );

    if (!deal) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Deal not found",
      });
    }

    // Notify all users who placed orders on this deal
    if (deal.orders?.length > 0) {
      try {
        const orderedUserIds = [
          ...new Set(
            deal.orders.map((o) => o.userId?.toString()).filter(Boolean),
          ),
        ];

        await createNotificationForMany({
          title: `Deal Cancelled: ${deal.title}`,
          message: reason
            ? `Reason: ${reason}`
            : "This deal has been cancelled by the organizer.",
          notificationType: NOTIFICATION_TYPES.DEAL_CANCELLED,
          receivers: orderedUserIds,
          metadata: { dealId: deal._id },
        });
      } catch (notifyErr) {
        console.error(
          "Failed to notify users of deal cancellation:",
          notifyErr,
        );
      }
    }

    res.json({
      success: true,
      code: res.statusCode,
      message: "Deal cancelled successfully.",
      deal,
    });
  } catch (error) {
    console.error("Error in removeDeal:", error);
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
      error: "Error cancelling deal",
    });
  }
};

export const updateExpiredDeals = async (req, res) => {
  try {
    const { societyId } = req.params;

    // Get current date and normalize to YYYY-MM-DD format for string comparison
    const today = new Date().toISOString().split("T")[0]; // Will give "2025-10-13"

    // Snapshot which deals are *about to* transition to EXPIRED (excludes
    // ones already expired) so the "Deal Closed" notification below fires
    // exactly once per deal, not on every call to this endpoint.
    const filter = {
      societyId,
      orderDeadlineDate: { $lt: today },
      dealStatus: { $ne: WHOLESALE_DEAL_STATUS.EXPIRED },
    };
    const newlyExpiredDeals = await WholesaleDeal.find(filter).select("title userId orders");

    const result = await WholesaleDeal.updateMany(filter, {
      $set: {
        isDealActive: false,
        dealStatus: WHOLESALE_DEAL_STATUS.EXPIRED,
        verificationStatus: { status: VERIFICATION_STATUS.REJECTED },
      },
    });

    res.status(200).json({
      success: true,
      code: res.statusCode,
      message: "Expired deals updated successfully",
    });

    for (const deal of newlyExpiredDeals) {
      const participantIds = [...new Set(
        (deal.orders || [])
          .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
          .map((o) => String(o.userId)),
      )];
      if (participantIds.length === 0) continue;
      try {
        await createNotificationForMany({
          title: `Deal Closed: ${deal.title}`,
          message: `${deal.title} is no longer accepting new orders.`,
          notificationType: NOTIFICATION_TYPES.DEAL_CLOSED,
          sender: deal.userId,
          receivers: participantIds,
          metadata: { dealId: deal._id },
        });
      } catch (err) {
        console.error("Failed to notify participants of deal closure:", err);
      }
    }
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

    // Validate if dealId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(dealId)) {
      return res.status(400).json({
        success: false,
        code: 400,
        error: "Invalid deal ID format",
      });
    }

    const deal = await WholesaleDeal.findOne({
      _id: dealId,
    })
      .populate("userId", "fullName phone profilePhotoUrl")
      .populate("orders.userId", "fullName phone profilePhotoUrl");

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
      .populate("orders.userId", "fullName phone profilePhotoUrl")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, code: res.statusCode, deals });
  } catch (error) {
    console.error("Error fetching deals by userId:", error);
    res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
  }
};

// Report a wholesale deal
export const reportDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: "userId and reason are required",
        code: res.statusCode,
      });
    }

    // Daily report limit logic (shared utility)
    const reportsToday = await getUserReportsToday(userId);
    if (reportsToday >= 3) {
      return res.status(429).json({
        success: false,
        message:
          "You can only report up to 3 items per day. Try again tomorrow.",
        code: res.statusCode,
      });
    }

    // Validate dealId
    if (!mongoose.Types.ObjectId.isValid(dealId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealId",
        code: res.statusCode,
      });
    }

    // Fetch the deal
    const deal = await WholesaleDeal.findById(dealId);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
        code: res.statusCode,
      });
    }

    // Check if user has already reported this deal
    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingReport = deal.report.find(
      (report) => report.userId.toString() === userObjectIdStr,
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this deal",
        code: res.statusCode,
      });
    }

    // Add new report
    deal.report.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      createdAt: new Date(),
    });

    // Increment totalReportCount
    deal.totalReportCount += 1;

    // Save the deal
    await deal.save();

    // Best-effort write to the permanent, queryable report log used by the
    // "My Reports" screens — awaited so it's guaranteed to be queryable by
    // the time this response reaches the client (logReport never throws).
    if (deal.userId) {
      await logReport({
        reporterId: userId,
        reportedUserId: deal.userId,
        contentType: "deal",
        contentId: deal._id,
        contentTitle: deal.title || "",
        reason,
      });
    }

    res.status(200).json({
      success: true,
      message: "Deal reported successfully",
      totalReportCount: deal.totalReportCount,
      reports: deal.report,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in reportDeal:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

export const getDealPostingAccountsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        message: "Valid userId is required",
      });
    }

    const user = await User.findById(userId)
      .select("fullName phone profilePhotoUrl")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        message: "User not found",
      });
    }

    const businesses = await Business.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select(
        "businessName name title phone logoUrl profilePhotoUrl verificationStatus",
      )
      .lean();

    const residentAccount = {
      id: user._id,
      type: USER_ROLES.RESIDENT,
      name: user.fullName || "Resident Account",
      phone: user.phone,
      profilePhotoUrl: user.profilePhotoUrl,
    };

    const businessAccounts = businesses.map((business) => ({
      id: business._id,
      type: USER_ROLES.BUSINESS,
      name:
        business.businessName ||
        business.name ||
        business.title ||
        "Business Account",
      phone: business.phone,
      profilePhotoUrl: business.logoUrl || business.profilePhotoUrl,
      verificationStatus: business.verificationStatus,
    }));

    console.log("Resident Account:", residentAccount);
    console.log("Business Accounts:", businessAccounts);

    return res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        residentAccount,
        businessAccounts,
      },
    });
  } catch (error) {
    console.error("Error fetching deal posting accounts:", error);

    return res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};
