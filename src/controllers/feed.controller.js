import Feed from "../models/feed.model.js";
import User from "../models/user.model.js";
import CommentReport from "../models/commentReport.model.js";
import mongoose from "mongoose";
import { getUserReportsToday } from "../utils/dailyReportLimit.js";
import { VERIFICATION_STATUS, USER_ROLES } from "../utils/constants.js";

const COMMENT_USER_FIELDS = "fullName profilePhotoUrl";
const MAX_COMMENT_LENGTH = 1000;

const normalizeCommentUser = (userField) => {
  if (!userField) return null;
  if (typeof userField === "object" && userField._id) {
    return {
      _id: userField._id.toString(),
      fullName: userField.fullName || "User",
      profilePhotoUrl: userField.profilePhotoUrl || null,
    };
  }
  return { _id: userField.toString(), fullName: "User", profilePhotoUrl: null };
};

const serializeComment = (comment) => ({
  _id: comment._id.toString(),
  user: normalizeCommentUser(comment.user),
  text: comment.text,
  createdAt: comment.createdAt,
});

// Create a new feed (post, poll, event)
export const createFeeds = async (req, res) => {
  try {
    const feed = await Feed.create(req.body);
    res.status(201).json({ success: true, feed, code: res.statusCode });

    if (feed.society) {
      try {
        const societyUserIds = await getSocietyUserIds(feed.society);
        const author = feed.user ? await User.findById(feed.user).select("fullName") : null;
        const authorName = author?.fullName || "Someone";

        if (feed.type === "event") {
          await createNotificationForMany({
            title: "New Event Added",
            message: `${feed.title || "A new event"} has been added.`,
            notificationType: NOTIFICATION_TYPES.EVENT_CREATED,
            sender: feed.user,
            receivers: societyUserIds,
            metadata: { eventId: feed._id },
          });
        } else if (feed.type === "post") {
          await createNotificationForMany({
            title: "New Post",
            message: `${authorName} added a new post.`,
            notificationType: NOTIFICATION_TYPES.POST_CREATED,
            sender: feed.user,
            receivers: societyUserIds,
            metadata: { referenceId: feed._id },
          });
        } else if (feed.type === "poll") {
          await createNotificationForMany({
            title: "New Poll",
            message: `${authorName} created a new poll: ${feed.title || ""}`.trim(),
            notificationType: NOTIFICATION_TYPES.POLL_CREATED,
            sender: feed.user,
            receivers: societyUserIds,
            metadata: { referenceId: feed._id },
          });
        }
      } catch (err) {
        console.error("Failed to notify society of new feed item:", err);
      }
    }
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// Get all feeds (optionally filter by type)
export const getFeeds = async (req, res) => {
  try {
    const filter = req.query.type ? { type: req.query.type } : {};
    const feeds = await Feed.find(filter)
      .populate("createdBy", "fullName email avatar")
      .populate("comments.user", "fullName avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, feeds, code: res.statusCode });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// Get all feeds by societyId
export const getFeedsBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    const feeds = await Feed.find({ society: societyId })
      .populate("user", "fullName profilePhotoUrl flatNo tower")
      .populate("rsvps", "fullName profilePhotoUrl email phone")
      //   .populate("comments.user", "fullName avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, feeds, code: res.statusCode });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// Get a single feed by ID with all populated fields
export const getFeedById = async (req, res) => {
  try {
    const { feedId } = req.params;
    const feed = await Feed.findById(feedId)
      .populate("user", "fullName profilePhotoUrl flatNo tower email phone")
      .populate("society", "name address city state pincode")
      .populate("comments.user", "fullName profilePhotoUrl")
      .populate("likes", "fullName profilePhotoUrl")
      .populate("rsvps", "fullName profilePhotoUrl email phone");

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    res.json({ success: true, feed, code: res.statusCode });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// Like or unlike a feed
export const toggleLike = async (req, res) => {
  try {
    const { feedId } = req.params;
    const userId = req.body.userId;
    const feed = await Feed.findById(feedId);
    if (!feed)
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    const index = feed.likes.indexOf(userId);
    const isLiking = index === -1;
    if (isLiking) {
      feed.likes.push(userId);
    } else {
      feed.likes.splice(index, 1);
    }
    await feed.save();
    res.json({ success: true, feed: feed, code: res.statusCode });

    if (isLiking && feed.user && String(feed.user) !== String(userId)) {
      try {
        await createNotification({
          title: "New Like",
          message: "Someone liked your post.",
          notificationType: NOTIFICATION_TYPES.POST_LIKED,
          sender: userId,
          receiver: feed.user,
          metadata: { referenceId: feed._id },
        });
      } catch (err) {
        console.error("Failed to notify feed owner of like:", err);
      }
    }
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// Add a comment to a feed (authenticated — userId from token)
export const addComment = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(feedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedId",
        code: res.statusCode,
      });
    }

    const trimmed = String(text || "").trim();
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
        code: res.statusCode,
      });
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`,
        code: res.statusCode,
      });
    }

    const feed = await Feed.findByIdAndUpdate(
      feedId,
      {
        $push: {
          comments: {
            user: userId,
            text: trimmed,
            createdAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true },
    ).populate("comments.user", COMMENT_USER_FIELDS);

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    const newComment = feed.comments[feed.comments.length - 1];

    res.status(201).json({
      success: true,
      comment: serializeComment(newComment),
      commentCount: feed.comments.length,
      code: res.statusCode,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Get comments for a feed (lazy-loaded when opening comments UI)
export const getFeedComments = async (req, res) => {
  try {
    const { feedId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(feedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedId",
        code: res.statusCode,
      });
    }

    const feed = await Feed.findById(feedId)
      .select("comments type")
      .populate("comments.user", COMMENT_USER_FIELDS)
      .lean();

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    const comments = (feed.comments || [])
      .map(serializeComment)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    res.json({
      success: true,
      feedId,
      feedType: feed.type,
      comments,
      commentCount: comments.length,
      code: res.statusCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Delete a comment — author or admin/super_admin only
export const deleteComment = async (req, res) => {
  try {
    const { feedId, commentId } = req.params;
    const requesterId = req.userId?.toString();
    const requesterRoles = req.user?.roles || [];
    const isModerator =
      requesterRoles.includes(USER_ROLES.ADMIN) ||
      requesterRoles.includes(USER_ROLES.SUPER_ADMIN);

    if (
      !mongoose.Types.ObjectId.isValid(feedId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedId or commentId",
        code: res.statusCode,
      });
    }

    const feed = await Feed.findById(feedId).select("comments");
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    const comment = feed.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        code: res.statusCode,
      });
    }

    const authorId = comment.user?.toString();
    if (!isModerator && authorId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this comment",
        code: res.statusCode,
      });
    }

    await Feed.findByIdAndUpdate(feedId, {
      $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } },
    });

    res.json({
      success: true,
      message: "Comment deleted",
      commentId,
      commentCount: Math.max(0, feed.comments.length - 1),
      code: res.statusCode,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Update a feed by ID
export const updateFeed = async (req, res) => {
  try {
    const { feedId } = req.params;
    const updates = req.body;

    // Fields that should not be updated
    const notAllowedUpdates = [
      "_id",
      "createdAt",
      "updatedAt",
      "user",
      "society",
    ];
    notAllowedUpdates.forEach((field) => delete updates[field]);

    const updatedFeed = await Feed.findByIdAndUpdate(feedId, updates, {
      new: true,
      runValidators: true,
    })
      .populate("user", "fullName profilePhotoUrl flatNo tower email phone")
      .populate("society", "name address city state pincode")
      .populate("comments.user", "fullName profilePhotoUrl")
      .populate("likes", "fullName profilePhotoUrl")
      .populate("rsvps", "fullName profilePhotoUrl email phone");

    if (!updatedFeed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    res.status(200).json({
      success: true,
      feed: updatedFeed,
      code: res.statusCode,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Vote on a poll
export const voteOnPoll = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { userId, optionId } = req.body;

    if (!userId || !optionId) {
      return res.status(400).json({
        success: false,
        message: "userId and optionId are required",
        code: res.statusCode,
      });
    }

    const feed = await Feed.findById(feedId);

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    if (feed.type !== "poll") {
      return res.status(400).json({
        success: false,
        message: "This feed is not a poll",
        code: res.statusCode,
      });
    }

    // Check if option exists
    const optionExists = feed.options.some((opt) => opt.id === optionId);
    if (!optionExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid option ID",
        code: res.statusCode,
      });
    }

    // Check if user already voted - do not allow multiple votes
    const existingVoteIndex = feed.votes.findIndex(
      (vote) => vote.userId.toString() === userId,
    );

    if (existingVoteIndex !== -1) {
      return res.status(409).json({
        success: false,
        message: "You have already voted on this poll",
        code: res.statusCode,
      });
    }

    // Add new vote
    feed.votes.push({ userId, optionId });

    await feed.save();
    await feed.populate("votes.userId", "fullName profilePhotoUrl");

    // Calculate vote results
    const totalVotes = feed.votes.length;
    const results = feed.options.map((option) => {
      const voteCount = feed.votes.filter(
        (vote) => vote.optionId === option.id,
      ).length;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

      return {
        optionId: option.id,
        optionName: option.name,
        voteCount,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      };
    });

    res.status(200).json({
      success: true,
      message: "Vote recorded",
      totalVotes,
      results,
      userVote: { userId, optionId },
      code: res.statusCode,
    });

    if (feed.user && String(feed.user) !== String(userId)) {
      try {
        await createNotification({
          title: "New Vote",
          message: "Someone voted on your poll.",
          notificationType: NOTIFICATION_TYPES.POLL_VOTED,
          sender: userId,
          receiver: feed.user,
          metadata: { referenceId: feed._id },
        });
      } catch (err) {
        console.error("Failed to notify poll owner of vote:", err);
      }
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Delete a feed
export const deleteFeed = async (req, res) => {
  try {
    const { feedId } = req.params;

    const feed = await Feed.findById(feedId).select("user");
    if (!feed)
      return res
        .status(404)
        .json({ success: false, message: "Feed not found" });

    // Only the author or an admin / super_admin may delete a feed.
    const requesterRoles = req.user?.roles || [];
    const isModerator =
      requesterRoles.includes(USER_ROLES.ADMIN) ||
      requesterRoles.includes(USER_ROLES.SUPER_ADMIN);
    const isOwner =
      feed.user && String(feed.user) === String(req.userId);

    if (!isModerator && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this post",
      });
    }

    await Feed.findByIdAndDelete(feedId);
    res.json({ success: true, message: "Feed deleted" });

    if (feed.type === "event" && feed.rsvps?.length > 0) {
      try {
        await createNotificationForMany({
          title: "Event Cancelled",
          message: `${feed.title || "An event"} you registered for has been cancelled.`,
          notificationType: NOTIFICATION_TYPES.EVENT_CANCELLED,
          receivers: feed.rsvps.map((r) => r.user),
          metadata: { eventId: feed._id },
        });
      } catch (err) {
        console.error("Failed to notify registrants of event cancellation:", err);
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add or update RSVP for an event
export const addOrUpdateRSVP = async (req, res) => {
  try {
    const { feedId } = req.params;
    const {
      userId,
      price = 0,
      participants = 1,
      profilePhotoUrl,
      fullName,
      verificationStatus,
    } = req.body;

    console.log("RSVP Request Body:", req.body);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
        code: res.statusCode,
      });
    }

    // Validate feedId and fetch feed with specific fields only
    let feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    if (feed.type !== "event") {
      return res.status(400).json({
        success: false,
        message: "This feed is not an event",
        code: res.statusCode,
      });
    }

    // Check if user already has an RSVP and get index
    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingRSVPIndex = feed.rsvps.findIndex(
      (rsvp) => rsvp.user.toString() === userObjectIdStr,
    );
    const isUpdate = existingRSVPIndex !== -1;

    console.log("Existing RSVP Index:", existingRSVPIndex);
    console.log("Is Update:", isUpdate);
    console.log("User ID to match:", userObjectIdStr);
    console.log(
      "RSVPs in feed:",
      feed.rsvps.map((r) => ({
        userId: r.user.toString(),
        fullName: r.fullName,
      })),
    );

    if (isUpdate) {
      const updateFields = {
        "rsvps.$[elem].price": price,
        "rsvps.$[elem].participants": participants,
        "rsvps.$[elem].profilePhotoUrl": profilePhotoUrl,
        "rsvps.$[elem].fullName": fullName,
      };

      if (verificationStatus?.status !== undefined) {
        updateFields["rsvps.$[elem].verificationStatus.status"] =
          verificationStatus.status;
      }
      if (verificationStatus?.rejectionReason !== undefined) {
        updateFields["rsvps.$[elem].verificationStatus.rejectionReason"] =
          verificationStatus.rejectionReason;
      }

      // Use atomic update for existing RSVP
      feed = await Feed.findByIdAndUpdate(
        feedId,
        { $set: updateFields },
        {
          arrayFilters: [{ "elem.user": new mongoose.Types.ObjectId(userId) }],
          new: true,
        },
      );
    } else {
      // Push new RSVP, auto-approved (no pending state for events)
      feed = await Feed.findByIdAndUpdate(
        feedId,
        {
          $push: {
            rsvps: {
              user: userId,
              price,
              participants,
              profilePhotoUrl,
              fullName,
              verificationStatus: {
                status: VERIFICATION_STATUS.APPROVED,
                rejectionReason: null,
              },
            },
          },
        },
        { new: true },
      );
    }

    // Calculate total participants and update registeredParticipants
    const totalParticipants = feed.rsvps.reduce(
      (sum, rsvp) => sum + rsvp.participants,
      0,
    );

    // Update registeredParticipants
    feed = await Feed.findByIdAndUpdate(
      feedId,
      { registeredParticipants: totalParticipants },
      { new: true },
    ); // Update User orders
    try {
      const feedObjectId = new mongoose.Types.ObjectId(feedId);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Check if user exists
      const user = await User.findById(userObjectId);
      if (!user) {
        console.error(`User not found: ${userId}`);
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: res.statusCode,
        });
      }

      // Check if order exists in user's orders array
      const existingOrderIndex = user.orders.findIndex(
        (order) =>
          order.sourceId &&
          order.sourceId.toString() === feedObjectId.toString(),
      );

      if (existingOrderIndex !== -1) {
        // Update existing order
        user.orders[existingOrderIndex].quantity = participants;
        user.orders[existingOrderIndex].amount = price;
        user.orders[existingOrderIndex].updatedAt = new Date();
        await user.save();
      } else {
        // Add new order
        user.orders.push({
          sourceType: "event",
          sourceId: feedObjectId,
          orderId: new mongoose.Types.ObjectId(),
          quantity: participants,
          amount: price,
          status: "pending",
          updatedAt: new Date(),
        });
        await user.save();
      }
    } catch (userError) {
      console.error("Error updating user orders:", userError);
      // Don't fail the RSVP if user update fails, just log it
    }

    res.status(200).json({
      success: true,
      message: isUpdate ? "RSVP updated" : "RSVP added",
      rsvps: feed.rsvps,
      registeredParticipants: totalParticipants,
      code: res.statusCode,
    });

    if (!isUpdate && feed.user && String(feed.user) !== String(userId)) {
      try {
        await createNotification({
          title: "New Event Registration",
          message: `${fullName || "Someone"} registered for ${feed.title || "your event"}.`,
          notificationType: NOTIFICATION_TYPES.EVENT_REGISTRATION,
          sender: userId,
          receiver: feed.user,
          metadata: { eventId: feed._id },
        });
      } catch (err) {
        console.error("Failed to notify event creator of new registration:", err);
      }
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Get all feeds by userId
export const getFeedsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const feeds = await Feed.find({ user: userId })
      .populate("user", "fullName profilePhotoUrl flatNo tower email phone")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, feeds });
  } catch (error) {
    console.error("Error in getFeedsByUserId:", error);
    res
      .status(500)
      .json({ success: false, error: "Error fetching feeds by userId" });
  }
};

// Remove RSVP from an event
export const removeRSVP = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
        code: res.statusCode,
      });
    }

    // Validate feedId and fetch feed
    let feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    if (feed.type !== "event") {
      return res.status(400).json({
        success: false,
        message: "This feed is not an event",
        code: res.statusCode,
      });
    }

    // Check if user has an RSVP
    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingRSVPIndex = feed.rsvps.findIndex(
      (rsvp) => rsvp.user.toString() === userObjectIdStr,
    );

    if (existingRSVPIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found for this user",
        code: res.statusCode,
      });
    }

    // Remove RSVP using atomic operation
    feed = await Feed.findByIdAndUpdate(
      feedId,
      {
        $pull: {
          rsvps: { user: new mongoose.Types.ObjectId(userId) },
        },
      },
      { new: true },
    );

    // Calculate total participants after removal
    const totalParticipants = feed.rsvps.reduce(
      (sum, rsvp) => sum + rsvp.participants,
      0,
    );

    // Update registeredParticipants
    feed = await Feed.findByIdAndUpdate(
      feedId,
      { registeredParticipants: totalParticipants },
      { new: true },
    );

    // Remove order from User's orders array
    try {
      const feedObjectId = new mongoose.Types.ObjectId(feedId);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      await User.findByIdAndUpdate(
        userObjectId,
        {
          $pull: {
            orders: {
              sourceId: feedObjectId,
              sourceType: "event",
            },
          },
        },
        { new: true },
      );
    } catch (userError) {
      console.error("Error removing order from user:", userError);
      // Don't fail the RSVP removal if user update fails, just log it
    }

    res.status(200).json({
      success: true,
      message: "RSVP removed successfully",
      rsvps: feed.rsvps,
      registeredParticipants: totalParticipants,
      code: res.statusCode,
    });

    if (feed.user && String(feed.user) !== String(userId)) {
      try {
        await createNotification({
          title: "Event Registration Cancelled",
          message: `A registration for ${feed.title || "your event"} was cancelled.`,
          notificationType: NOTIFICATION_TYPES.EVENT_REGISTRATION_CANCELLED,
          sender: userId,
          receiver: feed.user,
          metadata: { eventId: feed._id },
        });
      } catch (err) {
        console.error("Failed to notify event creator of RSVP cancellation:", err);
      }
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Update RSVP verification status (approve/reject)
export const updateRSVPVerificationStatus = async (req, res) => {
  try {
    const { feedId, userId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
        code: res.statusCode,
      });
    }

    if (!Object.values(VERIFICATION_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${Object.values(VERIFICATION_STATUS).join(", ")}`,
        code: res.statusCode,
      });
    }

    if (status === VERIFICATION_STATUS.REJECTED && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "rejectionReason is required when status is rejected",
        code: res.statusCode,
      });
    }

    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    if (feed.type !== "event") {
      return res.status(400).json({
        success: false,
        message: "This feed is not an event",
        code: res.statusCode,
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const rsvpExists = feed.rsvps.some(
      (rsvp) => rsvp.user.toString() === userObjectId.toString(),
    );

    if (!rsvpExists) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found for this user",
        code: res.statusCode,
      });
    }

    const updateFields = {
      "rsvps.$[elem].verificationStatus.status": status,
      "rsvps.$[elem].verificationStatus.rejectionReason":
        status === VERIFICATION_STATUS.REJECTED ? rejectionReason : null,
    };

    const updatedFeed = await Feed.findByIdAndUpdate(
      feedId,
      { $set: updateFields },
      {
        arrayFilters: [{ "elem.user": userObjectId }],
        new: true,
      },
    );

    res.status(200).json({
      success: true,
      message: `RSVP ${status} successfully`,
      rsvps: updatedFeed.rsvps,
      code: res.statusCode,
    });

    const statusNotificationType = {
      [VERIFICATION_STATUS.APPROVED]: NOTIFICATION_TYPES.EVENT_REGISTRATION_APPROVED,
      [VERIFICATION_STATUS.REJECTED]: NOTIFICATION_TYPES.EVENT_REGISTRATION_REJECTED,
    }[status];
    if (statusNotificationType) {
      try {
        await createNotification({
          title: status === VERIFICATION_STATUS.APPROVED ? "Registration Approved" : "Registration Rejected",
          message: `Your registration for ${updatedFeed.title || "the event"} has been ${status}.`,
          notificationType: statusNotificationType,
          receiver: userId,
          metadata: { eventId: feedId },
        });
      } catch (err) {
        console.error("Failed to notify registrant of RSVP status update:", err);
      }
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Add a review to an event feed
export const addReview = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { userId, userName, rating, comment, profilePhotoUrl } = req.body;

    if (!userId || !rating) {
      return res.status(400).json({
        success: false,
        message: "userId and rating are required",
        code: res.statusCode,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(feedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedId",
        code: res.statusCode,
      });
    }

    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    if (feed.type !== "event") {
      return res.status(400).json({
        success: false,
        message: "Reviews are only allowed for event type feeds",
        code: res.statusCode,
      });
    }

    // One review per user
    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const alreadyReviewed = (feed.reviews || []).some(
      (review) => review.userId.toString() === userObjectIdStr,
    );

    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this event",
        code: res.statusCode,
      });
    }

    feed.reviews = feed.reviews || [];
    feed.reviews.push({
      userId: new mongoose.Types.ObjectId(userId),
      userName,
      rating,
      comment,
      profilePhotoUrl,
    });

    await feed.save();

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      reviews: feed.reviews,
      code: res.statusCode,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Report a feed
export const reportFeed = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: "userId and reason are required",
        code: res.statusCode,
      });
    }

    // Validate feedId
    if (!mongoose.Types.ObjectId.isValid(feedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedId",
        code: res.statusCode,
      });
    }

    // Fetch the feed
    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed not found",
        code: res.statusCode,
      });
    }

    // Check if user has already reported this feed
    const userObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingReport = feed.report.find(
      (report) => report.userId.toString() === userObjectIdStr,
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this feed",
        code: res.statusCode,
      });
    }

    // --- Daily report limit logic (shared utility) ---
    const reportsToday = await getUserReportsToday(userId);
    if (reportsToday >= 3) {
      return res.status(429).json({
        success: false,
        message:
          "You can only report up to 3 items per day. Try again tomorrow.",
        code: res.statusCode,
      });
    }

    // Add new report
    feed.report.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      createdAt: new Date(),
    });

    // Increment totalReportCount
    feed.totalReportCount += 1;

    // Save the feed
    await feed.save();

    // Best-effort write to the permanent, queryable report log used by the
    // "My Reports" screens — awaited so it's guaranteed to be queryable by
    // the time this response reaches the client (logReport never throws).
    if (feed.user) {
      await logReport({
        reporterId: userId,
        reportedUserId: feed.user,
        contentType: feed.type, // "post" | "poll" | "event"
        contentId: feed._id,
        contentTitle: feed.title || feed.content?.slice(0, 100) || "",
        reason,
      });
    }

    res.status(200).json({
      success: true,
      message: "Feed reported successfully",
      totalReportCount: feed.totalReportCount,
      reports: feed.report,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in reportFeed:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};
