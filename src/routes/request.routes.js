import express from "express";
import {
  createRequest,
  getAllRequests,
  getRequestByType,
  updateRequestStatus,
} from "../controllers/request.controller.js";

const router = express.Router();

// router.get("/", getAllRequests);
router.post("/", createRequest);
router.get("/:type", getRequestByType);
router.put("/:id", updateRequestStatus);

export default router;
