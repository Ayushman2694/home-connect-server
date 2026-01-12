import Feed from "../models/feed.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

// Create a new feed (post, poll, event)
export const createFeeds = async (req, res) => {
  try {
    const feed = await Feed.create(req.body);
    res.status(201).json({ success: true, feed, code: res.statusCode });
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
    if (index === -1) {
      feed.likes.push(userId);
    } else {
      feed.likes.splice(index, 1);
    }
    await feed.save();
    res.json({ success: true, feed: feed, code: res.statusCode });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// Add a comment to a feed
export const addComment = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { userId, text } = req.body;
    const feed = await Feed.findById(feedId);
    if (!feed)
      return res
        .status(404)
        .json({ success: false, message: "Feed not found" });
    feed.comments.push({ user: userId, text });
    await feed.save();
    await feed.populate("comments.user", "fullName profilePhotoUrl");
    res.json({ success: true, comments: feed.comments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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

    // Check if user already voted
    const existingVoteIndex = feed.votes.findIndex(
      (vote) => vote.userId.toString() === userId
    );

    if (existingVoteIndex !== -1) {
      // Update existing vote
      feed.votes[existingVoteIndex].optionId = optionId;
      feed.votes[existingVoteIndex].createdAt = new Date();
    } else {
      // Add new vote
      feed.votes.push({ userId, optionId });
    }

    await feed.save();
    await feed.populate("votes.userId", "fullName profilePhotoUrl");

    // Calculate vote results
    const totalVotes = feed.votes.length;
    const results = feed.options.map((option) => {
      const voteCount = feed.votes.filter(
        (vote) => vote.optionId === option.id
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
      message: existingVoteIndex !== -1 ? "Vote updated" : "Vote recorded",
      totalVotes,
      results,
      userVote: { userId, optionId },
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

// Delete a feed
export const deleteFeed = async (req, res) => {
  try {
    const { feedId } = req.params;
    const feed = await Feed.findByIdAndDelete(feedId);
    if (!feed)
      return res
        .status(404)
        .json({ success: false, message: "Feed not found" });
    res.json({ success: true, message: "Feed deleted" });
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
      (rsvp) => rsvp.user.toString() === userObjectIdStr
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
      }))
    );

    if (isUpdate) {
      // Use atomic update for existing RSVP
      feed = await Feed.findByIdAndUpdate(
        feedId,
        {
          $set: {
            "rsvps.$[elem].price": price,
            "rsvps.$[elem].participants": participants,
            "rsvps.$[elem].profilePhotoUrl": profilePhotoUrl,
            "rsvps.$[elem].fullName": fullName,
          },
        },
        {
          arrayFilters: [{ "elem.user": new mongoose.Types.ObjectId(userId) }],
          new: true,
        }
      );
    } else {
      // Push new RSVP
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
            },
          },
        },
        { new: true }
      );
    }

    // Calculate total participants and update registeredParticipants
    const totalParticipants = feed.rsvps.reduce(
      (sum, rsvp) => sum + rsvp.participants,
      0
    );

    // Update registeredParticipants
    feed = await Feed.findByIdAndUpdate(
      feedId,
      { registeredParticipants: totalParticipants },
      { new: true }
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
          order.sourceId.toString() === feedObjectId.toString()
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
      (rsvp) => rsvp.user.toString() === userObjectIdStr
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
      { new: true }
    );

    // Calculate total participants after removal
    const totalParticipants = feed.rsvps.reduce(
      (sum, rsvp) => sum + rsvp.participants,
      0
    );

    // Update registeredParticipants
    feed = await Feed.findByIdAndUpdate(
      feedId,
      { registeredParticipants: totalParticipants },
      { new: true }
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
        { new: true }
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
      (report) => report.userId.toString() === userObjectIdStr
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this feed",
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
