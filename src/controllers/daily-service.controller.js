import DailyService from "../models/daily-service.model.js";

export const createDailyService = async (req, res) => {
  try {
    const {
      name,
      phone,
      category,
      description,
      images,
      averageRating,
      societyIds,
      verificationStatus,
    } = req.body;

    const existingUser = await DailyService.findOne({ phone });
    if (existingUser) {
      // Only add new societyId if not already present
      const newIds = Array.isArray(societyIds) ? societyIds : [societyIds];
      const currentIds = existingUser.societyIds.map((id) => id.toString());
      const idsToAdd = newIds.filter(
        (id) => !currentIds.includes(id.toString())
      );
      if (idsToAdd.length > 0) {
        existingUser.societyIds.push(...idsToAdd);
        await existingUser.save();
        return res.status(200).json({
          success: true,
          code: res.statusCode,
          message: "SocietyIds updated for existing user.",
          dailyService: await existingUser.populate({
            path: "societyIds",
            select: "-towers -totalFlats",
          }),
        });
      }
      return res.status(200).json({
        success: true,
        code: res.statusCode,
        message: "No new societyId to add.",
        dailyService: await existingUser.populate({
          path: "societyIds",
          select: "-towers -totalFlats",
        }),
      });
    }

    const newDailyService = new DailyService({
      name,
      phone,
      category,
      description,
      images,
      averageRating,
      societyIds,
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
    const dailyServices = await DailyService.find({
      societyIds: societyId,
    }).lean();
    const pendingReq = await DailyService.find({
      "verificationStatus.status": "pending",
    }).countDocuments();
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
