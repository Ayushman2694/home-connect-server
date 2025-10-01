import { PincodeData } from "../models/pincodeData.model.js";
import { Society } from "../models/society.model.js";
import User from "../models/user.model.js";

export const getSocietiesByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!pincode) {
      return res.status(400).json({ message: "Pincode is required" });
    }

    const pincodeData = await PincodeData.findOne({ pincode }).populate(
      "societies"
    );

    if (!pincodeData) {
      return res
        .status(404)
        .json({ message: "No societies found for this pincode" });
    }

    res.status(200).json({
      pincode: pincodeData.pincode,
      city: pincodeData.city,
      area: pincodeData.area,
      state: pincodeData.state,
      societies: pincodeData.societies,
    });
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
