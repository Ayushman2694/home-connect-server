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
      //   .populate("comments.user", "fullName avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, feeds, code: res.statusCode });
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
    await feed.populate("comments.user", "fullName avatar");
    res.json({ success: true, comments: feed.comments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
