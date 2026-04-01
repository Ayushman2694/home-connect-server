import User from "../models/user.model.js";
import Business from "../models/business.model.js";
import Feed from "../models/feed.model.js";
import WholesaleDeal from "../models/wholesale-deal.model.js";
import DailyService from "../models/daily-service.model.js";
import { VERIFICATION_STATUS } from "../utils/constants.js";

// Fetch all reported content across all entity types
export const getAllReportedContent = async (req, res) => {
  try {
    const { societyId } = req.params;

    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: "societyId is required",
        code: res.statusCode,
      });
    }

    const baseFilter = { totalReportCount: { $gt: 0 } };

    const results = await Promise.allSettled([
      User.find({ ...baseFilter, societyId })
        .select(
          "fullName phone roles profilePhotoUrl report totalReportCount createdAt",
        )
        .populate("report.userId", "fullName phone")
        .lean(),

      Business.find({ ...baseFilter, societyId })
        .select(
          "title category profilePhotoUrl userId societyId report totalReportCount createdAt",
        )
        .populate("userId", "fullName phone")
        .populate("report.userId", "fullName phone")
        .lean(),

      Feed.find({ ...baseFilter, society: societyId })
        .select("title type user society report totalReportCount createdAt")
        .populate("user", "fullName phone")
        .populate("report.userId", "fullName phone")
        .lean(),

      WholesaleDeal.find({ ...baseFilter, societyId })
        .select(
          "title category userId societyId report totalReportCount createdAt",
        )
        .populate("userId", "fullName phone")
        .populate("report.userId", "fullName phone")
        .lean(),

      DailyService.find({ ...baseFilter, societyIds: societyId })
        .select("name serviceType categoryId report totalReportCount createdAt")
        .populate("report.userId", "fullName phone")
        .lean(),
    ]);

    const [
      usersResult,
      businessesResult,
      feedsResult,
      dealsResult,
      servicesResult,
    ] = results;
    const reportedUsers =
      usersResult.status === "fulfilled" ? usersResult.value : [];
    const reportedBusinesses =
      businessesResult.status === "fulfilled" ? businessesResult.value : [];
    const reportedFeeds =
      feedsResult.status === "fulfilled" ? feedsResult.value : [];
    const reportedDeals =
      dealsResult.status === "fulfilled" ? dealsResult.value : [];
    const reportedDailyServices =
      servicesResult.status === "fulfilled" ? servicesResult.value : [];

    const errors = results
      .map((r, i) =>
        r.status === "rejected"
          ? { index: i, reason: r.reason?.message }
          : null,
      )
      .filter(Boolean);

    if (errors.length)
      console.error("getAllReportedContent partial errors:", errors);

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        reportedUsers: {
          total: reportedUsers.length,
          items: reportedUsers,
        },
        reportedBusinesses: {
          total: reportedBusinesses.length,
          items: reportedBusinesses,
        },
        reportedFeeds: {
          total: reportedFeeds.length,
          items: reportedFeeds,
        },
        reportedDeals: {
          total: reportedDeals.length,
          items: reportedDeals,
        },
        reportedDailyServices: {
          total: reportedDailyServices.length,
          items: reportedDailyServices,
        },
        totalCount:
          reportedUsers.length +
          reportedBusinesses.length +
          reportedFeeds.length +
          reportedDeals.length +
          reportedDailyServices.length,
        ...(errors.length && { partialErrors: errors }),
      },
    });
  } catch (error) {
    console.error("Error in getAllReportedContent:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reported content",
      code: res.statusCode,
    });
  }
};

// Fetch all pending businesses, deals, residents, and daily services
export const getAllPendingContent = async (req, res) => {
  try {
    const { societyId } = req.params;

    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: "societyId is required",
        code: res.statusCode,
      });
    }

    const pendingStatus = VERIFICATION_STATUS.PENDING;

    const results = await Promise.allSettled([
      User.find({
        societyId,
        "isAddressVerified.status": pendingStatus,
      })
        .select(
          "fullName phone roles profilePhotoUrl completeAddress tower flatNo isAddressVerified createdAt",
        )
        .lean(),

      Business.find({
        societyId,
        "verificationStatus.status": pendingStatus,
      })
        .select(
          "title category phone email profilePhotoUrl userId societyId verificationStatus createdAt completeAddress",
        )
        .populate("userId", "fullName phone")
        .lean(),

      WholesaleDeal.find({
        societyId,
        "verificationStatus.status": pendingStatus,
      })
        .select(
          "title category phone price minimumOrderQty userId societyId verificationStatus createdAt",
        )
        .populate("userId", "fullName phone")
        .lean(),

      DailyService.find({
        societyIds: societyId,
        "verificationStatus.status": pendingStatus,
      })
        .select(
          "name phone serviceType categoryId address rate verificationStatus createdAt",
        )
        .lean(),
    ]);

    const [residentsResult, businessesResult, dealsResult, servicesResult] =
      results;

    const pendingResidents =
      residentsResult.status === "fulfilled" ? residentsResult.value : [];
    const pendingBusinesses =
      businessesResult.status === "fulfilled" ? businessesResult.value : [];
    const pendingDeals =
      dealsResult.status === "fulfilled" ? dealsResult.value : [];
    const pendingDailyServices =
      servicesResult.status === "fulfilled" ? servicesResult.value : [];

    const errors = results
      .map((r, i) =>
        r.status === "rejected"
          ? { index: i, reason: r.reason?.message }
          : null,
      )
      .filter(Boolean);

    if (errors.length)
      console.error("getAllPendingContent partial errors:", errors);

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        pendingResidents: {
          total: pendingResidents.length,
          items: pendingResidents,
        },
        pendingBusinesses: {
          total: pendingBusinesses.length,
          items: pendingBusinesses,
        },
        pendingDeals: {
          total: pendingDeals.length,
          items: pendingDeals,
        },
        pendingDailyServices: {
          total: pendingDailyServices.length,
          items: pendingDailyServices,
        },
        totalCount:
          pendingResidents.length +
          pendingBusinesses.length +
          pendingDeals.length +
          pendingDailyServices.length,
        ...(errors.length && { partialErrors: errors }),
      },
    });
  } catch (error) {
    console.error("Error in getAllPendingContent:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending content",
      code: res.statusCode,
    });
  }
};

// Fetch all approved residents, businesses, and daily services
export const getAllApprovedContent = async (req, res) => {
  try {
    const { societyId } = req.params;

    if (!societyId) {
      return res.status(400).json({
        success: false,
        message: "societyId is required",
        code: res.statusCode,
      });
    }

    const approvedStatus = VERIFICATION_STATUS.APPROVED;

    const results = await Promise.allSettled([
      User.find({
        societyId,
        "isAddressVerified.status": approvedStatus,
      })
        .select(
          "fullName phone roles profilePhotoUrl completeAddress tower flatNo isAddressVerified createdAt",
        )
        .lean(),

      Business.find({
        societyId,
        "verificationStatus.status": approvedStatus,
      })
        .select(
          "title category phone email profilePhotoUrl userId societyId verificationStatus createdAt",
        )
        .populate("userId", "fullName phone")
        .lean(),

      DailyService.find({
        societyIds: societyId,
        "verificationStatus.status": approvedStatus,
      })
        .select(
          "name phone serviceType categoryId address rate verificationStatus createdAt",
        )
        .lean(),
    ]);

    const [residentsResult, businessesResult, servicesResult] = results;

    const approvedResidents =
      residentsResult.status === "fulfilled" ? residentsResult.value : [];
    const approvedBusinesses =
      businessesResult.status === "fulfilled" ? businessesResult.value : [];
    const approvedDailyServices =
      servicesResult.status === "fulfilled" ? servicesResult.value : [];

    const errors = results
      .map((r, i) =>
        r.status === "rejected"
          ? { index: i, reason: r.reason?.message }
          : null,
      )
      .filter(Boolean);

    if (errors.length)
      console.error("getAllApprovedContent partial errors:", errors);

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        approvedResidents: {
          total: approvedResidents.length,
          items: approvedResidents,
        },
        approvedBusinesses: {
          total: approvedBusinesses.length,
          items: approvedBusinesses,
        },
        approvedDailyServices: {
          total: approvedDailyServices.length,
          items: approvedDailyServices,
        },
        totalCount:
          approvedResidents.length +
          approvedBusinesses.length +
          approvedDailyServices.length,
        ...(errors.length && { partialErrors: errors }),
      },
    });
  } catch (error) {
    console.error("Error in getAllApprovedContent:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching approved content",
      code: res.statusCode,
    });
  }
};
