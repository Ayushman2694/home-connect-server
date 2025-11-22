import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  try {
    return jwt.sign(
      {
        sub: String(user._id),
        userId: String(user._id),
        email: user.email,
        role: user.role || "resident",
      },
      process.env.JWT_SECRET || "default_secret",
      { algorithm: "HS256", expiresIn: "60d" }
    );
  } catch (error) {
    console.error("Token generation error:", error);
    throw new Error("Failed to generate token");
  }
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "default_secret");
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid or expired token");
  }
};
