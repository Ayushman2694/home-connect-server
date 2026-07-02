import DailyService from "../models/daily-service.model.js";
import { VERIFICATION_STATUS, NOTIFICATION_TYPES } from "../utils/constants.js";
import mongoose from "mongoose";
import { getUserReportsToday } from "../utils/dailyReportLimit.js";
import {
  createNotificationForMany,
  getAdminUserIds,
} from "../services/notification.service.js";
import { isAdminUser } from "../middleware/auth.middleware.js";

export const createDailyService = async (req, res) => {
  try {
    const {
      name,
      phone,
      serviceType,
      categoryId,
      description,
      images,
      averageRating,
      societyIds,
      userIds,
      rate,
      workingHours,
      pricingRates,
      address,
      additionalInfo,
      createdBy,
      verificationStatus,
    } = req.body;

    // Helper to normalize and dedupe incoming ids into ObjectId[]
    const toObjectIdArray = (input) => {
      if (!input) return [];
      const arr = Array.isArray(input) ? input : [input];
      const ids = arr
        .filter(Boolean)
        .map((id) => (typeof id === "string" ? id : id?.toString?.()))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const oid of ids) {
        const key = oid.toString();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(oid);
        }
      }
      return unique;
    };

    const societyIdObjs = toObjectIdArray(societyIds);
    const userIdObjs = toObjectIdArray(userIds);

    // If a helper with this phone exists, only add new societyIds/userIds efficiently
    const existingUser = await DailyService.findOne({ phone });
    if (existingUser) {
      const addToSet = {};
      if (societyIdObjs.length) addToSet.societyIds = { $each: societyIdObjs };
      if (userIdObjs.length) addToSet.userIds = { $each: userIdObjs };

      if (Object.keys(addToSet).length === 0) {
        return res.status(409).json({
          success: false,
          code: 409,
          message: "Phone number already exists",
          helperId: existingUser._id,
          dailyService: await existingUser.populate({
            path: "societyIds",
            select: "-towers -totalFlats",
          }),
        });
      }

      const updated = await DailyService.findByIdAndUpdate(
        existingUser._id,
        { $addToSet: addToSet },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        code: res.statusCode,
        message: "Ids updated for existing daily service.",
        helperId: updated._id,
        dailyService: await updated.populate({
          path: "societyIds",
          select: "-towers -totalFlats",
        }),
      });
    }

    // Create new document with deduped ids
    const newDailyService = new DailyService({
      name,
      phone,
      serviceType,
      categoryId,
      description,
      images,
      averageRating,
      societyIds: societyIdObjs,
      userIds: userIdObjs,
      rate,
      pricingRates,
      additionalInfo,
      workingHours,
      address,
      createdBy,
      verificationStatus,
    });

    await newDailyService.save();
    res.status(201).json({
      success: true,
      code: res.statusCode,
      dailyService: await newDailyService.populate({
        path: "societyIds",
        select: "-towers -totalFlats",
      }),
    });
  } catch (error) {
    if (error) {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Validation Error",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }
  }
};

export const getAllDailyServicesBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(societyId)) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Invalid societyId",
      });
    }

    const societyObjectId = new mongoose.Types.ObjectId(societyId);

    const dailyServices = await DailyService.find({
      societyIds: societyObjectId,
    })
      .populate({
        path: "createdBy",
        select: "fullName phone profilePhotoUrl",
      })
      .populate({
        path: "societyIds",
        select: "-towers -totalFlats",
      })
      .populate({
        path: "userIds",
        select: "fullName phone profilePhotoUrl",
      })
      .lean();

    // Status counts filtered by same society for relevance
    const [pendingReq, approvedReq] = await Promise.all([
      DailyService.countDocuments({
        societyIds: societyObjectId,
        "verificationStatus.status": VERIFICATION_STATUS.PENDING,
      }),
      DailyService.countDocuments({
        societyIds: societyObjectId,
        "verificationStatus.status": VERIFICATION_STATUS.APPROVED,
      }),
    ]);
    const formatted = dailyServices.map((service) => ({
      ...service,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    }));
    res.json({
      success: true,
      code: res.statusCode,
      dailyServices: formatted,
      pendingReq,
      approvedReq,
      totalCount: dailyServices.length,
    });
  } catch (error) {
    console.error("Error in getAllDailyServices:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching daily services",
    });
  }
};

export const getHelperById = async (req, res) => {
  try {
    const { helperId } = req.params;
    const helper = await DailyService.findById(helperId);
    if (!helper) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Helper not found",
      });
    }
    res.status(200).json({
      success: true,
      code: res.statusCode,
      helper,
    });
  } catch (error) {
    console.error("Error in getHelperById:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching helper",
    });
  }
};

export const getAllApprovedDailyServices = async (req, res) => {
  try {
    const { societyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(societyId)) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Invalid societyId",
      });
    }

    const societyObjectId = new mongoose.Types.ObjectId(societyId);

    const approvedServices = await DailyService.find({
      societyIds: societyObjectId,
      "verificationStatus.status": VERIFICATION_STATUS.APPROVED,
    })
      .populate({
        path: "createdBy",
        select: "fullName phone profilePhotoUrl",
      })
      .populate({
        path: "societyIds",
        select: "-towers -totalFlats",
      })
      .populate({
        path: "userIds",
        select: "fullName phone profilePhotoUrl",
      })
      .lean();

    res.status(200).json({
      success: true,
      code: res.statusCode,
      dailyServices: approvedServices,
      totalCount: approvedServices.length,
    });
  } catch (error) {
    console.error("Error in getAllApprovedDailyServices:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching approved daily services",
    });
  }
};

export const updateDailyService = async (req, res) => {
  try {
    const { helperId } = req.params;
    const updates = req.body;
    const notAllowedUpdates = ["_id", "createdAt", "updatedAt", "phone"];

    // Remove not allowed fields from updates
    notAllowedUpdates.forEach((field) => delete updates[field]);

    // Only admins / super admins may change the verification (approval) status.
    if (updates.verificationStatus && !isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: "Only an admin can change verification status",
      });
    }
    // If report is being updated, sync totalReportCount with reason array length
    if (updates.report && Array.isArray(updates.report.reason)) {
      updates.report.totalReportCount = updates.report.reason.length;
    }
    const updatedHelper = await DailyService.findByIdAndUpdate(
      helperId,
      updates,
      { new: true },
    );

    if (!updatedHelper) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Helper not found",
      });
    }

    res.status(200).json({
      success: true,
      code: res.statusCode,
      helper: updatedHelper,
    });
  } catch (error) {
    console.error("Error in updateDailyService:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error updating helper",
    });
  }
};

// Add a review to a daily service and update averageRating
export const addDailyServiceReview = async (req, res) => {
  try {
    const { helperId } = req.params;
    const { userId, userName, rating, comment, profilePhotoUrl } = req.body;
    if (!userId || !rating) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "userId and rating are required",
      });
    }

    // Add the new review
    const pushResult = await DailyService.findByIdAndUpdate(
      helperId,
      {
        $push: {
          reviews: {
            userId,
            userName,
            rating,
            comment,
            profilePhotoUrl,
            createdAt: new Date(),
          },
        },
      },
      { new: true, select: "reviews", lean: true },
    );
    if (!pushResult) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Helper not found",
      });
    }

    // Calculate average rating
    const allReviews = pushResult.reviews || [];
    const avgRating =
      allReviews.length > 0
        ? (
            allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
          ).toFixed(1)
        : 0;

    // Update averageRating in the model
    await DailyService.findByIdAndUpdate(helperId, {
      averageRating: avgRating,
    });

    return res.status(201).json({
      success: true,
      message: "Review added",
      review: allReviews[allReviews.length - 1],
      avgRating: parseFloat(avgRating),
      totalReviews: allReviews.length,
    });
  } catch (error) {
    console.error("Error in addDailyServiceReview:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to add review",
    });
  }
};

// Report a daily service helper
export const reportDailyService = async (req, res) => {
  try {
    const { helperId } = req.params;
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

    if (!mongoose.Types.ObjectId.isValid(helperId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid helperId",
        code: res.statusCode,
      });
    }

    const helper = await DailyService.findById(helperId);
    if (!helper) {
      return res.status(404).json({
        success: false,
        message: "Helper not found",
        code: res.statusCode,
      });
    }

    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingReport = helper.report.find(
      (report) => report.userId.toString() === userObjectIdStr,
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this helper",
        code: res.statusCode,
      });
    }

    helper.report.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      createdAt: new Date(),
    });

    helper.totalReportCount += 1;

    await helper.save();

    // Notify admins of the new report
    try {
      const adminIds = await getAdminUserIds();
      await createNotificationForMany({
        title: "New Report Submitted",
        message: `Daily Service Helper Reported: ${helper.name} has been reported for: ${reason}`,
        notificationType: NOTIFICATION_TYPES.REPORT_SUBMITTED,
        sender: userId,
        receivers: adminIds,
        metadata: { referenceId: helper._id },
      });
    } catch (err) {
      console.error(
        "Failed to create admin notification for reported helper:",
        err,
      );
    }

    res.status(200).json({
      success: true,
      message: "Helper reported successfully",
      totalReportCount: helper.totalReportCount,
      reports: helper.report,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in reportDailyService:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Delete a daily service (creator or admin/super_admin).
export const deleteDailyService = async (req, res) => {
  try {
    const { helperId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(helperId)) {
      return res
        .status(400)
        .json({ success: false, code: 400, error: "Invalid helperId" });
    }

    const helper = await DailyService.findById(helperId).select("createdBy");
    if (!helper) {
      return res
        .status(404)
        .json({ success: false, code: 404, error: "Service not found" });
    }

    // Authorization: only the creator or an admin/super_admin.
    const isOwner =
      helper.createdBy && String(helper.createdBy) === String(req.userId);
    if (!isOwner && !isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: "You are not allowed to delete this service",
      });
    }

    await DailyService.findByIdAndDelete(helperId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteDailyService:", error);
    res
      .status(500)
      .json({ success: false, code: 500, error: "Error deleting service" });
  }
};
