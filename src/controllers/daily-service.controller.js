import DailyService from "../models/daily-service.model.js";
import { VERIFICATION_STATUS } from "../utils/constants.js";
import mongoose from "mongoose";

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
        return res.status(200).json({
          success: true,
          code: res.statusCode,
          message: "No new ids to add.",
          dailyService: await existingUser.populate({
            path: "societyIds",
            select: "-towers -totalFlats",
          }),
        });
      }

      const updated = await DailyService.findByIdAndUpdate(
        existingUser._id,
        { $addToSet: addToSet },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        code: res.statusCode,
        message: "Ids updated for existing daily service.",
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

export const updateDailyService = async (req, res) => {
  try {
    const { helperId } = req.params;
    const updates = req.body;
    const notAllowedUpdates = ["_id", "createdAt", "updatedAt", "phone"];

    // Remove not allowed fields from updates
    notAllowedUpdates.forEach((field) => delete updates[field]);
    // If report is being updated, sync totalReportCount with reason array length
    if (updates.report && Array.isArray(updates.report.reason)) {
      updates.report.totalReportCount = updates.report.reason.length;
    }
    const updatedHelper = await DailyService.findByIdAndUpdate(
      helperId,
      updates,
      { new: true }
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
