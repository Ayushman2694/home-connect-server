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
