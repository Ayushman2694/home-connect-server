import Request from "../models/request.model.js";
import User from "../models/user.model.js";


export const createUser = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res
        .status(400)
        .json({ success: false, error: "Phone is required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "User already exists" });
    }

    // Create new user
    const user = new User({
      phone,
      lastLogin: new Date(),
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        id: String(user._id),
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error in createUser:", error);
    res.status(500).json({
      success: false,
      error: `Error in createUser controller: ${error.message}`,
    });
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
