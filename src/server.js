import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import requestRoutes from "./routes/request.routes.js";
import societyRoutes from "./routes/society.routes.js";
import businessRoutes from "./routes/business.routes.js";
import dailyServiceRoutes from "./routes/dailyService.routes.js";
import wholesaleDealRoutes from "./routes/wholesale-deal.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { startNotificationWatcher } from "./watchers/notification.watcher.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//auth routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/society", societyRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/daily-service", dailyServiceRoutes);
app.use("/api/wholesale-deal", wholesaleDealRoutes);
app.use("/api/notification", notificationRoutes);

app.listen(process.env.PORT || 3000, () => {
  connectDB();
  startNotificationWatcher();
  console.log(`Server running on port ${process.env.PORT}`);
});
