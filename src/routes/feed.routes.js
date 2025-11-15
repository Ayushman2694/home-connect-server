import { Router } from "express";
import {
  createFeeds,
  getFeedsBySocietyId,
  getFeedById,
  toggleLike,
  updateFeed,
  addComment,
} from "../controllers/feed.controller.js";

const router = Router();

router.get("/getfeeds/:societyId", getFeedsBySocietyId);
router.get("/getFeed/:feedId", getFeedById);
router.post("/create", createFeeds);
router.post("/comment/:feedId", addComment);
router.patch("/:feedId/like", toggleLike);
router.patch("/update/:feedId", updateFeed);

export default router;
