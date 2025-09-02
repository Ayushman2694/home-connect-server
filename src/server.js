import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//auth routes
app.use("/api/auth", authRoutes);

app.listen(process.env.PORT || 3000, () => {
  connectDB();
  console.log(`Server running on port ${process.env.PORT}`);
});
