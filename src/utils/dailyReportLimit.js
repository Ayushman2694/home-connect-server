import mongoose from "mongoose";
import Feed from "../models/feed.model.js";
import Business from "../models/business.model.js";
import DailyService from "../models/daily-service.model.js";
import WholesaleDeal from "../models/wholesale-deal.model.js";

/**
 * Counts the total number of reports a user has made today across all reportable collections.
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<number>} Total reports today
 */
export async function getUserReportsToday(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Helper to count reports in a collection
  async function countReports(Model) {
    const result = await Model.aggregate([
      { $unwind: "$report" },
      {
        $match: {
          "report.userId": userObjId,
          "report.createdAt": { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $count: "count" },
    ]);
    return (result[0] && result[0].count) || 0;
  }

  const [feed, business, service, deal] = await Promise.all([
    countReports(Feed),
    countReports(Business),
    countReports(DailyService),
    countReports(WholesaleDeal),
  ]);

  return feed + business + service + deal;
}
