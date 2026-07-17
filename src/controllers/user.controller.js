import mongoose from "mongoose";
import Request from "../models/request.model.js";
import User from "../models/user.model.js";
import Business from "../models/business.model.js";
import Feed from "../models/feed.model.js";
import {
  createNotification,
  createNotificationForMany,
  getAdminUserIds,
} from "../services/notification.service.js";
import WholesaleDeal from "../models/wholesale-deal.model.js";
import DailyService from "../models/daily-service.model.js";
import { Notification } from "../models/notification.model.js";
import {
  VERIFICATION_STATUS,
  USER_ROLES,
  NOTIFICATION_TYPES,
} from "../utils/constants.js";
import { isAdminUser } from "../middleware/auth.middleware.js";

export const createUser = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      roles,
      profilePhotoUrl,
      societyId,
      flatNo,
      tower,
      email,
      residentType,
      residentProofUrls,
      isAddressVerified,
    } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      // 409 Conflict — 404 was semantically wrong for "already exists"
      return res.status(409).json({
        message: "User already exists",
        userId: existingUser._id,
      });
    }

    if (!residentType) {
      return res.status(400).json({ message: "Resident type is required" });
    }

    // Non-admin requesters cannot assign privileged roles or pre-approve
    // themselves — otherwise anyone could register straight as admin.
    const requesterIsAdmin = isAdminUser(req.user);
    let safeRoles = roles;
    let safeVerification = isAddressVerified;
    if (!requesterIsAdmin) {
      const allowedSelfRoles = [
        USER_ROLES.GUEST,
        USER_ROLES.RESIDENT,
        USER_ROLES.BUSINESS,
      ];
      safeRoles = (Array.isArray(roles) ? roles : []).filter((r) =>
        allowedSelfRoles.includes(r),
      );
      if (safeRoles.length === 0) safeRoles = [USER_ROLES.GUEST];
      safeVerification = { status: VERIFICATION_STATUS.PENDING };
    }

    const sanitizedEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : undefined;

    const newUser = new User({
      fullName,
      phone,
      roles: safeRoles,
      profilePhotoUrl,
      societyId,
      flatNo,
      tower,
      residentType,
      residentProofUrls,
      isAddressVerified: safeVerification,
      ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
    });

    await newUser.save();

    // ── Notify all admins of new resident registration ──
    try {
      const adminIds = await getAdminUserIds();
      await createNotificationForMany({
        title: "New Resident Registration",
        message: `${fullName} has submitted a resident profile for approval.`,
        notificationType: NOTIFICATION_TYPES.RESIDENT_VERIFICATION_SUBMITTED,
        receivers: adminIds,
        metadata: { referenceId: newUser._id },
      });
    } catch (err) {
      console.error("Failed to notify admins:", err);
    }

    return res.status(201).json({
      message: "User created successfully",
      newUser: await newUser.populate({
        path: "societyId",
        select: "-towers -totalFlats",
      }),
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in create user controller:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllUserBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;

    // This returns a full member directory (names, phones, flats). Admins may
    // query any society; everyone else is restricted to their own society, so
    // a guest/resident can't scrape other societies' residents by guessing ids.
    if (!isAdminUser(req.user)) {
      const sameSociety =
        req.user?.societyId &&
        String(req.user.societyId) === String(societyId);
      if (!sameSociety) {
        return res.status(403).json({
          success: false,
          code: 403,
          message: "You can only view members of your own society",
        });
      }
    }

    // Only return users with 'business' or 'resident' in roles and matching societyId
    const query = {
      roles: { $in: ["business", "resident"] },
    };
    if (societyId) {
      query.societyId = societyId;
    }
    const users = await User.find(query).populate({
      path: "societyId",
      select: "-totalFlats -totalResidents",
    });
    res.json({
      success: true,
      code: res.statusCode,
      users,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching users",
    });
  }
};

export const getRequestByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await Request.find({ user: userId })
      .populate("user", "fullName phone roles")
      .lean();

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Error in getRequestByUserId:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching user requests",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };

    // ── Authorization ──────────────────────────────────────────────────────
    // Only the account owner or an admin/super_admin may update a user.
    const requesterIsAdmin = isAdminUser(req.user);
    const isSelf = String(req.userId) === String(userId);

    if (!requesterIsAdmin && !isSelf) {
      return res.status(403).json({
        message: "You are not allowed to update this user",
        status: "failure",
        code: 403,
      });
    }

    // Non-admins (self-service updates) cannot escalate privileges or
    // self-approve. They may only (re)submit verification as "pending" and
    // hold non-privileged roles. Moderation fields are stripped outright.
    if (!requesterIsAdmin) {
      delete updates.report;
      delete updates.totalReportCount;

      if (updates.isAddressVerified) {
        const submittedStatus = updates.isAddressVerified.status;
        if (submittedStatus !== VERIFICATION_STATUS.PENDING) {
          delete updates.isAddressVerified;
        }
      }

      if (Array.isArray(updates.roles)) {
        const allowedSelfRoles = [
          USER_ROLES.GUEST,
          USER_ROLES.RESIDENT,
          USER_ROLES.BUSINESS,
        ];
        updates.roles = updates.roles.filter((r) =>
          allowedSelfRoles.includes(r),
        );
        if (updates.roles.length === 0) delete updates.roles;
      }
    }
    // Sanitize email
    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      if (typeof updates.email === "string") {
        const trimmed = updates.email.trim();
        if (!trimmed) delete updates.email;
        else updates.email = trimmed.toLowerCase();
      } else {
        delete updates.email;
      }
    }
    if (updates.societyId) {
      if (mongoose.Types.ObjectId.isValid(updates.societyId)) {
        updates.societyId = new mongoose.Types.ObjectId(updates.societyId);
      } else {
        return res.status(400).json({ message: "Invalid societyId format" });
      }
    }
    if (updates.businessId) {
      if (mongoose.Types.ObjectId.isValid(updates.businessId)) {
        updates.businessId = new mongoose.Types.ObjectId(updates.businessId);
      } else {
        return res.status(400).json({ message: "Invalid businessId format" });
      }
    }

    // Fetch old user to compare verification status
    const oldUser = await User.findById(userId).select(
      "isAddressVerified fullName",
    );

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).populate({ path: "societyId", select: "-towers -totalFlats" });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "failure",
        code: res.statusCode,
      });
    }
    // ── Notify user if approval status changed ──
    try {
      const oldStatus = oldUser?.isAddressVerified?.status;
      const newStatus = updates?.isAddressVerified?.status;

      if (newStatus && oldStatus !== newStatus) {
        await createNotification({
          title:
            newStatus === "approved" ? "Profile Approved" : "Profile Rejected",
          message:
            newStatus === "approved"
              ? "Your resident profile has been approved! You now have full access."
              : updates?.isAddressVerified?.rejectionReason
                ? `Your profile was rejected: ${updates.isAddressVerified.rejectionReason}`
                : "Your resident profile was rejected. Please contact support.",
          notificationType:
            newStatus === "approved"
              ? NOTIFICATION_TYPES.RESIDENT_VERIFICATION_APPROVED
              : NOTIFICATION_TYPES.RESIDENT_VERIFICATION_REJECTED,
          receiver: user._id,
        });
      }
    } catch (err) {
      console.error("Failed to send approval notification:", err);
    }

    return res
      .status(200)
      .json({ user, status: "success", code: res.statusCode });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(400).json({
      message: err.message,
      status: "failure",
      code: res.statusCode,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate({
      path: "societyId",
      select: "-towers -totalFlats",
    });
    // .populate({ path: "businessId" });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Contact details and moderation data are private. The owner and admins get
    // the full record; everyone else gets a public profile with PII stripped
    // (so viewing another resident's profile no longer leaks their phone/email/
    // address or who has reported them).
    const isSelfOrAdmin =
      String(req.userId) === String(userId) || isAdminUser(req.user);
    if (!isSelfOrAdmin) {
      const publicUser = user.toObject();
      delete publicUser.phone;
      delete publicUser.email;
      delete publicUser.completeAddress;
      delete publicUser.report;
      delete publicUser.totalReportCount;
      delete publicUser.orders;
      delete publicUser.lastLogin;
      return res.json(publicUser);
    }

    return res.json(user);
  } catch (error) {
    console.error("Error in getUserById:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Error fetching user",
    });
  }
};

export const syncUserBusinessIds = async (req, res) => {
  try {
    const { userId } = req.params;
    // Find all businesses for this user
    const businesses = await Business.find({ userId }).select("_id");
    const businessIds = businesses.map((b) => b._id);
    // Update user's businessIds array
    const user = await User.findByIdAndUpdate(
      userId,
      { businessIds },
      { new: true, runValidators: true },
    ).populate({
      path: "societyId",
      select: "-towers -totalFlats",
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "User not found",
      });
    }
    res.json({
      success: true,
      code: res.statusCode,
      message: "User's businessIds synced successfully",
      user,
    });
  } catch (error) {
    console.error("Error in syncUserBusinessIds:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error syncing businessIds",
    });
  }
};

export const syncUserBusinessIdsWithStatus = async (req, res) => {
  try {
    console.log("Syncing user business IDs with status...");
    const { userId } = req.params;
    // Find all businesses for this user, select _id and verificationStatus
    const businesses = await Business.find({ userId })
      .select("_id verificationStatus.status")
      .lean();
    // Map to array of objects { id, verificationStatus } and ensure uniqueness by id
    const seen = new Set();
    const businessIds = [];
    for (const b of businesses) {
      if (!seen.has(String(b._id))) {
        businessIds.push({
          id: b._id,
          verificationStatus: b.verificationStatus?.status || null,
        });
        seen.add(String(b._id));
      }
    }
    // Update user's businessIds array
    const user = await User.findByIdAndUpdate(
      userId,
      { businessIds },
      { new: true, runValidators: true },
    ).populate({
      path: "societyId",
      select: "-towers -totalFlats",
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        error: "User not found",
      });
    }
    res.json({
      success: true,
      code: res.statusCode,
      message: "User's businessIds with status synced successfully",
      user,
    });
  } catch (error) {
    console.error("Error in syncUserBusinessIdsWithStatus:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error syncing businessIds with status",
    });
  }
};

export const getPendingUsersBySocietyId = async (req, res) => {
  try {
    const { societyId } = req.params;
    const query = {
      roles: { $in: ["resident"] },
    };
    if (!societyId) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "societyId is required",
      });
    }
    const users = await User.find({
      ...query,
      societyId,
      "isAddressVerified.status": VERIFICATION_STATUS.PENDING,
    }).populate({
      path: "societyId",
      select: "-towers -totalFlats -totalResidents",
    });
    res.json({
      success: true,
      code: res.statusCode,
      users,
    });
  } catch (error) {
    console.error("Error in getPendingUsersBySocietyId:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Error fetching pending users",
    });
  }
};

// Remove a user by userId
/**
 * Remove every lingering reference to a user from documents owned by *other*
 * members — comments, likes, poll votes, event RSVPs, reviews and reports — and
 * recompute the cached counters those arrays feed (participant count, report
 * count, rating averages). Orders are intentionally preserved as they are
 * financial commitments. Best-effort: the caller treats failures as non-fatal.
 */
const scrubUserReferences = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const filterOut = (field, key) => ({
    $filter: {
      input: { $ifNull: [`$${field}`, []] },
      as: "item",
      cond: key ? { $ne: [`$$item.${key}`, uid] } : { $ne: ["$$item", uid] },
    },
  });

  await Promise.all([
    // Feeds: traces left on other members' posts / polls / events.
    Feed.updateMany(
      {
        $or: [
          { likes: uid },
          { "comments.user": uid },
          { "votes.userId": uid },
          { "rsvps.user": uid },
          { "reviews.userId": uid },
          { "report.userId": uid },
        ],
      },
      [
        {
          $set: {
            likes: filterOut("likes"),
            comments: filterOut("comments", "user"),
            votes: filterOut("votes", "userId"),
            rsvps: filterOut("rsvps", "user"),
            reviews: filterOut("reviews", "userId"),
            report: filterOut("report", "userId"),
          },
        },
        {
          $set: {
            registeredParticipants: { $sum: "$rsvps.participants" },
            totalReportCount: { $size: "$report" },
          },
        },
      ],
    ),

    // Businesses: reviews and reports left by the user.
    Business.updateMany(
      { $or: [{ "reviews.userId": uid }, { "report.userId": uid }] },
      [
        {
          $set: {
            reviews: filterOut("reviews", "userId"),
            report: filterOut("report", "userId"),
          },
        },
        {
          $set: {
            totalReportCount: { $size: "$report" },
            avgRating: {
              $cond: [
                { $gt: [{ $size: "$reviews" }, 0] },
                { $avg: "$reviews.rating" },
                0,
              ],
            },
          },
        },
      ],
    ),

    // Wholesale deals: reviews and reports left by the user.
    WholesaleDeal.updateMany(
      { $or: [{ "reviews.userId": uid }, { "report.userId": uid }] },
      [
        {
          $set: {
            reviews: filterOut("reviews", "userId"),
            report: filterOut("report", "userId"),
          },
        },
        { $set: { totalReportCount: { $size: "$report" } } },
      ],
    ),

    // Daily services (shared): drop membership, reviews and reports, and unset
    // ownership when this user created the entry.
    DailyService.updateMany(
      {
        $or: [
          { userIds: uid },
          { "reviews.userId": uid },
          { "report.userId": uid },
          { createdBy: uid },
        ],
      },
      [
        {
          $set: {
            userIds: filterOut("userIds"),
            reviews: filterOut("reviews", "userId"),
            report: filterOut("report", "userId"),
            createdBy: {
              $cond: [{ $eq: ["$createdBy", uid] }, null, "$createdBy"],
            },
          },
        },
        {
          $set: {
            totalReportCount: { $size: "$report" },
            averageRating: {
              $cond: [
                { $gt: [{ $size: "$reviews" }, 0] },
                { $avg: "$reviews.rating" },
                0,
              ],
            },
          },
        },
      ],
    ),

    // Reports this user filed against other users.
    User.updateMany({ "report.userId": uid }, [
      { $set: { report: filterOut("report", "userId") } },
      { $set: { totalReportCount: { $size: "$report" } } },
    ]),

    // The user's own requests and notifications.
    Request.deleteMany({ user: uid }),
    Notification.deleteMany({ userId: String(userId) }),
  ]);
};

export const removeUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, code: 400, message: "Invalid userId" });
    }

    // ── Authorization: only the account owner or an admin/super_admin ──
    const requesterIsAdmin = isAdminUser(req.user);
    const isSelf = String(req.userId) === String(userId);
    if (!requesterIsAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "You are not allowed to delete this account",
      });
    }

    // Fetch (do NOT delete yet) — all guards below must run before deletion.
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "User not found" });
    }

    // ── Guard: block resident deletion while a business account still exists ──
    // Deleting the resident first would orphan the business (and its active
    // deals/events); the owner must delete the business account first. That
    // deletion enforces its own active-deals/events guard.
    const ownedBusinesses = await Business.find({ userId })
      .select("_id title category")
      .lean();

    if (ownedBusinesses.length > 0) {
      return res.status(409).json({
        success: false,
        code: 409,
        message:
          "Please delete your business account before deleting your resident account.",
        reason: "BUSINESS_EXISTS",
        businesses: ownedBusinesses,
      });
    }

    // ── Active orders are informational only — they never block deletion ──
    const activeOrderStatuses = ["pending", "confirmed", "approved"];
    const activeOrders = (user.orders || []).filter((o) =>
      activeOrderStatuses.includes(o.status),
    );

    // Notify the member only when an admin removes them (self-deletion is silent).
    if (!isSelf) {
      try {
        await createNotification({
          title: "Removed from Community",
          message: "You have been removed from the community by an admin.",
          notificationType: NOTIFICATION_TYPES.COMMUNITY_REMOVED,
          receiver: userId,
        });
      } catch (err) {
        console.error("Failed to notify user of community removal:", err);
      }
    }

    // ── Cascade delete the user's owned content, then the user ──
    const [feedResult, businessResult, dealResult] = await Promise.all([
      Feed.deleteMany({ user: userId }),
      Business.deleteMany({ userId }),
      WholesaleDeal.deleteMany({ userId }),
    ]);

    // Scrub the user's scattered references from other members' documents.
    // Best-effort — a failure here must not block account deletion.
    try {
      await scrubUserReferences(userId);
    } catch (scrubErr) {
      console.error(
        `Failed to scrub references for user ${userId} (continuing):`,
        scrubErr,
      );
    }

    await User.findByIdAndDelete(userId);

    console.log(
      `Removed user ${userId}: ${feedResult.deletedCount} feeds, ` +
        `${businessResult.deletedCount} businesses, ${dealResult.deletedCount} deals`,
    );

    res.status(200).json({
      success: true,
      code: 200,
      message: "User removed successfully",
      feedsDeleted: feedResult.deletedCount,
      businessesDeleted: businessResult.deletedCount,
      dealsDeleted: dealResult.deletedCount,
      activeOrdersAtDeletion: activeOrders.length,
    });
  } catch (error) {
    console.error("Error in removeUser:", error);
    res
      .status(500)
      .json({ success: false, code: 500, message: "Error removing user" });
  }
};

// Fetch logged-in user's orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
        code: res.statusCode,
      });
    }

    // Orders are private — only the owner or an admin may view them.
    if (String(req.userId) !== String(userId) && !isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view these orders",
        code: 403,
      });
    }

    const user = await User.findById(userId).select("orders").lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: res.statusCode,
      });
    }

    // Populate sourceId references based on sourceType
    const ordersWithDetails = await Promise.all(
      user.orders.map(async (order) => {
        try {
          if (order.sourceType === "business") {
            const business = await Business.findById(order.sourceId)
              .select("title category profilePhotoUrl price")
              .lean();
            return {
              ...order,
              source: business,
            };
          } else if (order.sourceType === "wholesale") {
            const wholesaleDeal = await mongoose
              .model("WholesaleDeal")
              .findById(order.sourceId)
              .select("title price quantity")
              .lean();
            return {
              ...order,
              source: wholesaleDeal,
            };
          } else if (order.sourceType === "event") {
            const feed = await mongoose
              .model("Feed")
              .findById(order.sourceId)
              .select(
                "title eventStartDate eventStartTime eventEndDate eventEndTime price",
              )
              .lean();
            return {
              ...order,
              source: feed,
            };
          }
          return order;
        } catch (err) {
          console.error(`Error populating order ${order._id}:`, err);
          return order;
        }
      }),
    );

    res.status(200).json({
      success: true,
      orders: ordersWithDetails,
      totalOrders: ordersWithDetails.length,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in getUserOrders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user orders",
      code: res.statusCode,
    });
  }
};

// Report a user
export const reportUser = async (req, res) => {
  try {
    const { userId: reportedUserId } = req.params;
    const { reason } = req.body;
    // Reporter identity comes from the authenticated token, not the body —
    // trusting body.userId let anyone file reports under another user's name.
    const userId = String(req.userId);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "reason is required",
        code: res.statusCode,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportedUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId in params",
        code: res.statusCode,
      });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: res.statusCode,
      });
    }

    const reporterObjectIdStr = new mongoose.Types.ObjectId(userId).toString();
    const existingReport = reportedUser.report.find(
      (report) => report.userId.toString() === reporterObjectIdStr,
    );

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this user",
        code: res.statusCode,
      });
    }

    reportedUser.report.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      createdAt: new Date(),
    });

    reportedUser.totalReportCount += 1;

    await reportedUser.save();

    // Notify admins of the new report
    try {
      const adminIds = await getAdminUserIds();
      await createNotificationForMany({
        title: "New Report Submitted",
        message: `User Reported: ${reportedUser.fullName} has been reported for: ${reason}`,
        notificationType: NOTIFICATION_TYPES.REPORT_SUBMITTED,
        sender: userId,
        receivers: adminIds,
        metadata: { referenceId: reportedUser._id },
      });
    } catch (err) {
      console.error(
        "Failed to create admin notification for reported user:",
        err,
      );
    }

    res.status(200).json({
      success: true,
      message: "User reported successfully",
      totalReportCount: reportedUser.totalReportCount,
      reports: reportedUser.report,
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in reportUser:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      code: res.statusCode,
    });
  }
};

// Check if user is authorized to add a new business
export const isUserBusinessAllowed = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
        code: res.statusCode,
      });
    }

    const user = await User.findById(userId).select("roles businessIds");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: res.statusCode,
      });
    }

    const businessCount = user.businessIds ? user.businessIds.length : 0;
    const isGuest = user.roles.includes("guest");

    let isAuthorized = true;
    let reason = "";

    // If user is a guest and has at least 1 business, cannot create new business
    if (isGuest && businessCount >= 1) {
      isAuthorized = false;
      reason = "Guest users can only have 1 business";
    }
    // If user has any other role and has 2 or more businesses, cannot create 3rd business
    else if (!isGuest && businessCount >= 2) {
      isAuthorized = false;
      reason = "Users with this role can only have 2 businesses";
    }

    res.status(200).json({
      success: true,
      isAuthorized,
      businessCount,
      userRole: user.roles,
      reason: reason || "User is authorized to create a new business",
      code: res.statusCode,
    });
  } catch (error) {
    console.error("Error in checkBusinessCreationAuthorization:", error);
    res.status(500).json({
      success: false,
      message: "Error checking business creation authorization",
      code: res.statusCode,
    });
  }
};
