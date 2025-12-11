import { Router } from "express";
import {
  createFeeds,
  getFeedsBySocietyId,
  getFeedById,
  toggleLike,
  updateFeed,
  addComment,
  voteOnPoll,
  getFeedsByUserId,
  deleteFeed,
} from "../controllers/feed.controller.js";

const router = Router();

router.get("/getfeeds/:societyId", getFeedsBySocietyId);
router.get("/getFeed/:feedId", getFeedById);
router.get("/user/:userId", getFeedsByUserId);
router.post("/create", createFeeds);
router.post("/comment/:feedId", addComment);
router.post("/vote/:feedId", voteOnPoll);
router.patch("/:feedId/like", toggleLike);
router.patch("/update/:feedId", updateFeed);
router.delete("/:feedId", deleteFeed);

export default router;
