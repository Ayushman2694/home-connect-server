import { PincodeData } from "../models/pincodeData.model.js";
import { Society } from "../models/society.model.js";
import User from "../models/user.model.js";

export const getSocietyById = async (req, res) => {
  try {
    const { societyId } = req.params;

    if (!societyId) {
      return res
        .status(400)
        .json({
          message: "Society ID is required",
          success: false,
          code: res.statusCode,
        });
    }

    const society = await Society.findById(societyId);

    if (!society) {
      return res
        .status(404)
        .json({
          message: "Society not found",
          success: false,
          code: res.statusCode,
        });
    }

    res.status(200).json({ society, success: true, code: res.statusCode });
  } catch (err) {
    console.error("Error in getSocietiesByPincode controller:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

// Get all societies
export const getAllSocieties = async (req, res) => {
  try {
    const societies = await Society.find();
    res.status(200).json(societies);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching societies", error: error.message });
  }
};

export const getTotalResidents = async (req, res) => {
  try {
    const registeredResidents = await User.find({
      "isAddressVerified.status": "approved",
      roles: { $in: ["resident"] },
    }).countDocuments();
    res.status(200).json({ totalResidents: registeredResidents });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching total residents",
      error: error.message,
    });
  }
};
