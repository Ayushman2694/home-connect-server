import User from "../models/user.model.js";


export const createUser = async (req, res) => {
  try {
    const { phone, fullName, profilePic } = req.body;

    if (!phone || !fullName) {
      return res
        .status(400)
        .json({ success: false, error: "Phone and full name are required" });
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
      fullName,
      profilePic: profilePic || "",
      roles: { resident: true },
      isAddressVerified: false,
      lastLogin: new Date(),
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        id: String(user._id),
        phone: user.phone,
        fullName: user.fullName,
        profilePic: user.profilePic,
        isAddressVerified: user.isAddressVerified,
        roles: user.roles,
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
