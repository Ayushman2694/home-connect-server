import express from "express";
import { createRequest, getAllRequests, updateRequestStatus } from "../controllers/request.controller.js";

const router = express.Router();

router.get("/", getAllRequests);
router.post("/", createRequest);
router.put("/:id", updateRequestStatus);

export default router;