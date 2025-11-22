import { verifyToken } from "../utils/generateToken.js";
import User from "../models/user.model.js";

export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "Access denied. Token is required.",
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database to ensure user still exists
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "Invalid token. User not found.",
      });
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.message.includes("expired")) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "Token expired. Please login again.",
        tokenExpired: true,
      });
    }

    return res.status(401).json({
      success: false,
      code: 401,
      error: "Invalid token.",
    });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      if (token) {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select("-password");

        if (user) {
          req.user = user;
          req.userId = user._id;
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: "Access forbidden. Insufficient permissions.",
      });
    }

    next();
  };
};
