import Feed from "../models/feed.model.js";

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
