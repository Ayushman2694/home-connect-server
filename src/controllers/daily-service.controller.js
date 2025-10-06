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

export const getAllDailyServices = async (req, res) => {
  try {
    const dailyServices = await DailyService.find().lean();
    const pendingReq = await DailyService.find({
      verificationStatus: "pending",
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
