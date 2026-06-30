// Define constants for enums and validation
export const USER_ROLES = {
  GUEST: "guest",
  RESIDENT: "resident",
  BUSINESS: "business",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
};

export const DEAL_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  EXPIRED: "expired",
  PENDING: "pending",
  CANCELLED: "cancelled",
};

export const ResidentTypeEnum = {
  TENANT: "Tenant",
  OWNER: "Owner",
};

// Matches the lifecycle statuses WholesaleDeal.pre("save") actually assigns
// and what the frontend (assets/enums/common.enum.ts DEAL_STATUS) sends/expects.
export const WHOLESALE_DEAL_STATUS = {
  ACTIVE: "ACTIVE",
  UNLOCKING: "UNLOCKING",
  UNLOCKED: "UNLOCKED",
  FULL: "FULL",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
  COMING_SOON: "COMING_SOON",
  CLOSING_SOON: "CLOSING_SOON",
};

// Single source of truth for in-app/push notification types. The frontend
// mirrors these in types/notification.type.ts for icon + navigation mapping.
// Types marked "reserved" have no trigger wired yet because the underlying
// feature (membership, comment replies/mentions, community invitations,
// comment moderation) does not exist in the codebase yet.
export const NOTIFICATION_TYPES = {
  // Deal
  DEAL_CREATED: "DEAL_CREATED",
  DEAL_ORDERED: "DEAL_ORDERED", // to deal creator
  ORDER_PLACED: "ORDER_PLACED", // to orderer
  ORDER_APPROVED: "ORDER_APPROVED",
  ORDER_REJECTED: "ORDER_REJECTED",
  DEAL_CLOSED: "DEAL_CLOSED",
  DEAL_CANCELLED: "DEAL_CANCELLED",
  DEAL_COMPLETED: "DEAL_COMPLETED",
  DEAL_UPDATED: "DEAL_UPDATED",
  DEAL_ORDER_CANCELLED: "DEAL_ORDER_CANCELLED", // to deal creator

  // Feed (post/poll)
  POST_CREATED: "POST_CREATED",
  POLL_CREATED: "POLL_CREATED",
  POST_LIKED: "POST_LIKED",
  POLL_VOTED: "POLL_VOTED",

  // Event
  EVENT_CREATED: "EVENT_CREATED",
  EVENT_REGISTRATION: "EVENT_REGISTRATION",
  EVENT_REGISTRATION_APPROVED: "EVENT_REGISTRATION_APPROVED",
  EVENT_REGISTRATION_REJECTED: "EVENT_REGISTRATION_REJECTED",
  EVENT_REGISTRATION_CANCELLED: "EVENT_REGISTRATION_CANCELLED",
  EVENT_CANCELLED: "EVENT_CANCELLED",
  EVENT_REMINDER: "EVENT_REMINDER",
  EVENT_COMPLETED: "EVENT_COMPLETED",

  // Community
  RESIDENT_VERIFICATION_SUBMITTED: "RESIDENT_VERIFICATION_SUBMITTED", // to admins
  RESIDENT_VERIFICATION_APPROVED: "RESIDENT_VERIFICATION_APPROVED",
  RESIDENT_VERIFICATION_REJECTED: "RESIDENT_VERIFICATION_REJECTED",
  COMMUNITY_JOINED: "COMMUNITY_JOINED",
  COMMUNITY_INVITATION: "COMMUNITY_INVITATION", // reserved: no invite system exists
  COMMUNITY_REMOVED: "COMMUNITY_REMOVED",

  // Business
  BUSINESS_VERIFICATION_SUBMITTED: "BUSINESS_VERIFICATION_SUBMITTED", // to admins
  BUSINESS_VERIFICATION_APPROVED: "BUSINESS_VERIFICATION_APPROVED",
  BUSINESS_VERIFICATION_REJECTED: "BUSINESS_VERIFICATION_REJECTED",

  // Membership - reserved: no membership feature exists yet
  MEMBERSHIP_PURCHASED: "MEMBERSHIP_PURCHASED",
  MEMBERSHIP_ACTIVATED: "MEMBERSHIP_ACTIVATED",
  MEMBERSHIP_EXPIRING_SOON: "MEMBERSHIP_EXPIRING_SOON",
  MEMBERSHIP_EXPIRED: "MEMBERSHIP_EXPIRED",
  MEMBERSHIP_PAYMENT_FAILED: "MEMBERSHIP_PAYMENT_FAILED",

  // Comment
  COMMENT_ADDED: "COMMENT_ADDED",
  COMMENT_REPLY: "COMMENT_REPLY", // reserved: comments have no reply/thread support yet
  COMMENT_MENTION: "COMMENT_MENTION", // reserved: no @mention parsing yet
  COMMENT_REPORT_SUBMITTED: "COMMENT_REPORT_SUBMITTED",
  COMMENT_HIDDEN: "COMMENT_HIDDEN", // reserved: no comment-hide moderation action yet

  // Report
  REPORT_SUBMITTED: "REPORT_SUBMITTED",
  REPORT_REVIEWED: "REPORT_REVIEWED",
  REPORT_RESOLVED: "REPORT_RESOLVED",
  CONTENT_REPORTED: "CONTENT_REPORTED", // to the reported content's owner

  // Announcement
  ANNOUNCEMENT: "ANNOUNCEMENT", // society-wide or admin-selected broadcast
};
