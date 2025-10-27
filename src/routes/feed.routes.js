import { Router } from "express";
import {
  createFeeds,
  getFeedsBySocietyId,
  toggleLike,
} from "../controllers/feed.controller.js";

const router = Router();

router.get("/getfeeds/:societyId", getFeedsBySocietyId);
router.post("/create", createFeeds);
router.patch("/:feedId/like", toggleLike);

export default router;
