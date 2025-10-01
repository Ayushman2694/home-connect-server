import Business from "../models/business.model.js";

export const createBusiness = async (req, res) => {
  try {
    const {
      businessTitle,
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
    } = req.body;

    const newBusiness = new Business({
      businessTitle,
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
    });

    await newBusiness.save();

    res.status(201).json({
      success: true,
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
        error: "Validation Error",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      error: "Error creating business",
    });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId).lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        error: "Business not found",
      });
    }

    res.json({
      success: true,
      business,
    });
  } catch (error) {
    console.error("Error in getBusinessById:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid business ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Error fetching business",
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

    // Validate update fields
    const allowedUpdates = ["businessName", "category", "description"];

    // Filter out any fields that aren't in allowedUpdates
    const updateData = Object.keys(updates)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
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
        error: "Business not found",
      });
    }

    res.json({
      success: true,
      message: "Business updated successfully",
      business,
    });
  } catch (error) {
    console.error("Error in updateBusiness:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid business ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Error updating business",
    });
  }
};

/**
 * Delete business by ID
 * @route DELETE /api/business/:businessId
 */
export const deleteBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findByIdAndDelete(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: "Business not found",
      });
    }

    res.json({
      success: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteBusiness:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid business ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Error deleting business",
    });
  }
};
