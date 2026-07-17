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
// All mutating routes require authentication — previously anyone could
// create/edit posts, vote, RSVP or report without a token.
router.post("/create", authenticate, createFeeds);
router.post("/comment/:feedId", authenticate, addComment);
router.delete("/comment/:feedId/:commentId", authenticate, deleteComment);
router.post("/vote/:feedId", authenticate, voteOnPoll);
router.post("/rsvp/:feedId", authenticate, addOrUpdateRSVP);
router.patch("/rsvp/:feedId/verify/:userId", authenticate, updateRSVPVerificationStatus);
router.post("/report/:feedId", authenticate, reportFeed);
router.post("/review/:feedId", authenticate, addReview);
router.delete("/rsvp/:feedId", authenticate, removeRSVP);
router.patch("/:feedId/like", authenticate, toggleLike);
router.patch("/update/:feedId", authenticate, updateFeed);
router.delete("/:feedId", authenticate, deleteFeed);

export default router;
