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
  addOrUpdateRSVP,
  removeRSVP,
  reportFeed,
  addReview,
  updateRSVPVerificationStatus,
} from "../controllers/feed.controller.js";

const router = Router();

router.get("/getfeeds/:societyId", getFeedsBySocietyId);
router.get("/getFeed/:feedId", getFeedById);
router.get("/user/:userId", getFeedsByUserId);
router.post("/create", createFeeds);
router.post("/comment/:feedId", addComment);
router.post("/vote/:feedId", voteOnPoll);
router.post("/rsvp/:feedId", addOrUpdateRSVP);
router.patch("/rsvp/:feedId/verify/:userId", updateRSVPVerificationStatus);
router.post("/report/:feedId", reportFeed);
router.post("/review/:feedId", addReview);
router.delete("/rsvp/:feedId", removeRSVP);
router.patch("/:feedId/like", toggleLike);
router.patch("/update/:feedId", updateFeed);
router.delete("/:feedId", deleteFeed);

export default router;
