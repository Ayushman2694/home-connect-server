import jwt from "jsonwebtoken";

// Signing tokens with a hardcoded fallback secret would make every token
// forgeable, so JWT_SECRET must come from the environment. Resolved lazily
// (not at module load) so dotenv.config() in server.js has run first.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. Add it to .env before starting the server."
    );
  }
  return secret;
}

export const generateToken = (user) => {
  try {
    return jwt.sign(
      {
        sub: String(user._id),
        userId: String(user._id),
        email: user.email,
        roles:
          Array.isArray(user.roles) && user.roles.length
            ? user.roles
            : ["guest"],
      },
      getJwtSecret(),
      { algorithm: "HS256", expiresIn: "60d" }
    );
  } catch (error) {
    console.error("Token generation error:", error);
    throw new Error("Failed to generate token");
  }
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid or expired token");
  }
};
