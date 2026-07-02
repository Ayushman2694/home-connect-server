import { Router } from "express";
import {
  createFeeds,
  getFeedsBySocietyId,
  getFeedById,
  toggleLike,
  updateFeed,
  addComment,
  getFeedComments,
  deleteComment,
  voteOnPoll,
  getFeedsByUserId,
  deleteFeed,
  addOrUpdateRSVP,
  removeRSVP,
  reportFeed,
  addReview,
  updateRSVPVerificationStatus,
} from "../controllers/feed.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/getfeeds/:societyId", getFeedsBySocietyId);
router.get("/getFeed/:feedId", getFeedById);
router.get("/comments/:feedId", getFeedComments);
router.get("/user/:userId", getFeedsByUserId);
router.post("/create", createFeeds);
router.post("/comment/:feedId", authenticate, addComment);
router.delete("/comment/:feedId/:commentId", authenticate, deleteComment);
router.post("/vote/:feedId", voteOnPoll);
router.post("/rsvp/:feedId", addOrUpdateRSVP);
router.patch("/rsvp/:feedId/verify/:userId", updateRSVPVerificationStatus);
router.post("/report/:feedId", reportFeed);
router.post("/review/:feedId", addReview);
router.delete("/rsvp/:feedId", removeRSVP);
router.patch("/:feedId/like", toggleLike);
router.patch("/update/:feedId", updateFeed);
router.delete("/:feedId", authenticate, deleteFeed);

export default router;
