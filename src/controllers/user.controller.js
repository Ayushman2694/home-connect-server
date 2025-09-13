import Request from "../models/request.model.js";
import User from "../models/user.model.js";

export const createUser = async (req, res) => {
  try {
    const { name, phone, roles, profile_photo_url, resident_info, business_info } = req.body;

    // phone is mandatory for OTP-based login
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // check if user already exists
    let existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(200).json({ 
        message: "User already exists", 
        user: existingUser 
      });
    }

    // create new user
    const newUser = new User({
      name,
      phone,
      roles: roles && roles.length ? roles : ["guest"], // default role guest
      profile_photo_url,
      resident_info,
      business_info,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error in create user controller:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json({
      success: true,
      users: users.map(user => ({
        id: String(user._id),
        phone: user.phone,
      })),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      error: `Error in getAllUsers controller: ${error.message}`,
    });
  }
  };

export const getRequestByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await Request.find({ user: userId }).populate("user");
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error in getRequestByUserId:", error);
    res.status(500).json({
      success: false,
      error: `Error in getRequestByUserId controller: ${error.message}`,
    });
  }
};

export const updateUser = async(req,res)=>{
  try {
    const {id} = req.params
    const updates = req.body;

    // 🔒 Define allowed fields (flat + nested)
    const allowedFields = [
      "fullName",
      "profile_photo_url",
      "is_Address_verified",
      "verifyStatus",
      "roles",

      // Resident-specific
      "resident_info.flat_number",
      "resident_info.building",
      "resident_info.society_id",
      "resident_info.emergency_contacts",

      // Business-specific
      "business_info.business_name",
      "business_info.category",
      "business_info.description",
      "business_info.website",
      "business_info.location",
      "business_info.gst_number",
    ];

    const updateData = {};

    // Support nested dot notation: e.g. { "resident_info.flat_number": "A-101" }
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(id, { $set: updateData }, { 
      new: true, 
      runValidators: true 
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

