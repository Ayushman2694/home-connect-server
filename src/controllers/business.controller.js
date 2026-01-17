import mongoose from "mongoose";
import Business from "../models/business.model.js";
import { VERIFICATION_STATUS } from "../utils/constants.js";
import { getUserReportsToday } from "../utils/dailyReportLimit.js";

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
      profilePhotoUrl,
      email,
      gstNumber,
    } = req.body;

    const newBusiness = await Business.create({
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
      profilePhotoUrl,
      email,
      gstNumber,
    });

    const populatedBusiness = await Business.findById(newBusiness._id)
      .populate(
        "userId",
        "fullName phone profilePhotoUrl flatNumber tower roles societyId"
      )
      .lean();

    res.status(201).json({
      success: true,
      code: res.statusCode,
      message: "Business created successfully",
      business: populatedBusiness,
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

    const business = await Business.findByIdAndUpdate(
      businessId,
      { $set: updateData },
      {
        new: true, // Return the updated document
        runValidators: true, // Run validation on update
        lean: true,
      }
    );

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
    const businesses = await Business.find()
      .populate("userId", "fullName phone profilePhotoUrl flatNumber roles")
      .select("-orders -reviews -report") // removed -catalogue
      .lean();
    res.json({
      success: true,
      code: res.statusCode,
      businesses,
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
      .populate(
        "userId",
        "fullName phone profilePhotoUrl flatNumber tower roles societyId"
      )
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

export const getBusinessesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Invalid userId",
      });
    }

    const businesses = await Business.find({ userId })
      .populate("societyId", "name address city state pincode")
      .populate(
        "userId",
        "fullName phone profilePhotoUrl flatNumber tower roles societyId"
      )
      .select("-orders -catalogue -reviews -report")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      success: true,
      code: res.statusCode,
      businesses,
      totalCount: businesses.length,
    });
  } catch (error) {
    console.error("Error in getBusinessesByUserId:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching businesses by userId",
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

// Add a catalogue item to a business
export const addCatalogueItem = async (req, res) => {
  try {
    const { businessId } = req.params;
    const catalogueData = req.body;

    // Use atomic $push for efficiency
    const business = await Business.findByIdAndUpdate(
      businessId,
      { $push: { catalogue: catalogueData } },
      { new: true, select: "catalogue", lean: true }
    );
    if (!business) {
      return res
        .status(404)
        .json({ success: false, error: "Business not found" });
    }
    res.status(200).json({
      success: true,
      message: "Catalogue item added",
      catalogue: business.catalogue,
    });
  } catch (error) {
    console.error("Error adding catalogue item:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to add catalogue item" });
  }
};

// Get catalogue array by businessId
export const getCatalogueByBusinessId = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId)
      .select("catalogue")
      .lean();
    if (!business) {
      return res
        .status(404)
        .json({ success: false, error: "Business not found" });
    }
    res.status(200).json({ success: true, catalogue: business.catalogue });
  } catch (error) {
    console.error("Error fetching catalogue:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch catalogue" });
  }
};

// Update a catalogue item by businessId and catalogueId
export const updateCatalogueItem = async (req, res) => {
  try {
    const { businessId, catalogueId } = req.params;
    const updateData = req.body;

    // Use atomic update with positional operator
    const business = await Business.findOneAndUpdate(
      { _id: businessId, "catalogue._id": catalogueId },
      {
        $set: Object.fromEntries(
          Object.entries(updateData).map(([k, v]) => [`catalogue.$.${k}`, v])
        ),
      },
      {
        new: true,
        select: { catalogue: { $elemMatch: { _id: catalogueId } } },
        lean: true,
      }
    );
    if (!business || !business.catalogue || business.catalogue.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Catalogue item not found" });
    }
    res.status(200).json({
      success: true,
      message: "Catalogue item updated",
      item: business.catalogue[0],
    });
  } catch (error) {
    console.error("Error updating catalogue item:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update catalogue item" });
  }
};

// Add or update a review for a business (always add new review to array)
export const addOrUpdateBusinessReview = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { userId, userName, rating, comment, profilePhotoUrl } = req.body;
    if (!userId || !rating) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "userId and rating are required",
      });
    }

    // Always add a new review to the array (do not update existing)
    const pushResult = await Business.findByIdAndUpdate(
      businessId,
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
      { new: true, select: { reviews: { $slice: -1 } }, lean: true }
    );
    if (!pushResult) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "Business not found",
      });
    }

    // Calculate average rating from all reviews
    const allReviews = await Business.findById(businessId)
      .select("reviews")
      .lean();
    const avgRating =
      allReviews.reviews && allReviews.reviews.length > 0
        ? (
            allReviews.reviews.reduce((sum, r) => sum + r.rating, 0) /
            allReviews.reviews.length
          ).toFixed(2)
        : 0;

    return res.status(201).json({
      success: true,
      message: "Review added",
      review: pushResult.reviews[pushResult.reviews.length - 1],
      avgRating: parseFloat(avgRating),
      totalReviews: allReviews.reviews ? allReviews.reviews.length : 0,
    });
  } catch (error) {
    console.error("Error in addOrUpdateBusinessReview:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to add review",
    });
  }
};

// Report a business
export const reportBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
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

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid businessId",
        code: res.statusCode,
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
        code: res.statusCode,
      });
    }

    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingReport = business.report.find(
      (report) => report.userId.toString() === userObjectIdStr
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this business",
        code: res.statusCode,
      });
    }

    business.report.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      createdAt: new Date(),
    });

    business.totalReportCount += 1;

    await business.save();

    res.status(200).json({
      success: true,
      message: "Business reported successfully",
      totalReportCount: business.totalReportCount,
      reports: business.report,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in reportBusiness:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};
