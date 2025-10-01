import Request from "../models/request.model.js";
import User from "../models/user.model.js";

export const getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find().populate("user");
    res.json({ success: true, requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: `error in getAllRequests controller: ${error.message}`,
    });
  }
};

export const createRequest = async (req, res) => {
  try {
    const { user, status, message } = req.body;
    const newRequest = new Request({ user, status, message });
    if (!newRequest) {
      res
        .status(400)
        .json({ success: false, error: "Failed to create request" });
    }
    await newRequest.save();
    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: `error in createRequest controller: ${error.message}`,
    });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedRequest = await Request.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updatedRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }
    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: `error in updateRequest controller: ${error.message}`,
    });
  }
};

export const getRequestByType = async (req, res) => {
  try {
    const { type } = req.params;
    const pendingReq = await User.find({
      "isAddressVerified.status": "pending",
      roles: { $in: [type] },
    }).populate("societyId");
    const approvedReq = await User.find({
      "isAddressVerified.status": "approved",
      roles: { $in: [type] },
    }).populate("societyId");
    if (pendingReq.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }
    res.json({
      success: true,
      code: res.statusCode,
      approvedReq: approvedReq.length,
      request: pendingReq.map((Req) => ({
        _id: Req._id,
        fullName: Req.fullName,
        flatNumber: Req.flatNumber,
        societyId: Req.societyId,
        email: Req.email,
        phone: Req.phone,
        roles: Req.roles,
        isAddressVerified: Req.isAddressVerified,
        updatedAt: Req.updatedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: `error in getResidentRequests controller: ${error.message}`,
    });
  }
};
