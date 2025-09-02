export const generateToken= async(req,res)=>{
try {
       const token = jwt.sign(
          { sub: String(user._id) },
          process.env.JWT_SECRET || "default_secret",
          { algorithm: "HS256", expiresIn: "30d" }
        );
    
        return res.json({
          ok: true,
          token,
          user:user.id
        });
} catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
}
}
