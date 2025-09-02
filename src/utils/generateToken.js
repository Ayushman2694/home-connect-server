import jwt from "jsonwebtoken"
export const generateToken = (user)=>{
try {
       return jwt.sign(
          { sub: String(user._id) },
          process.env.JWT_SECRET || "default_secret",
          { algorithm: "HS256", expiresIn: "30d" }
        );

} catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
}
}
