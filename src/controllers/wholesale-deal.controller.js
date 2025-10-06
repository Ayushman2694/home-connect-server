export const createWholesaleDeal = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNumber,
      tower,
    } = req.body;

    // Use static method from model
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(404).json({
        message: "User already exists",
      });
    }

    const newUser = new User({
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNumber,
      tower,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      newUser: await newUser.populate({
        path: "societyId",
        select: "-towers -totalFlats",
      }),
    });
  } catch (error) {
    console.error("Error in create user controller:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
