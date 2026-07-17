import express from "express";
import {
  signUpload,
  deleteImage,
  transformImage,
  uploadImage,
  getImageDetails,
} from "../controllers/media.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/media/sign
 * @desc    Generate signed upload parameters for direct frontend upload
 * @access  Private
 */
router.post("/sign", authenticate, signUpload);

/**
 * @route   POST /api/media/test-sign
 * @desc    Test endpoint for debugging — now authenticated. An open signing
 *          endpoint let anyone mint valid Cloudinary upload signatures and
 *          upload to your account at your expense.
 * @access  Private
 */
router.post("/test-sign", authenticate, signUpload);

/**
 * @route   DELETE /api/media/delete
 * @desc    Delete image from Cloudinary
 * @access  Private
 */
router.delete("/delete", authenticate, deleteImage);

/**
 * @route   POST /api/media/transform
 * @desc    Get transformed image URL with specified parameters
 * @access  Private
 */
router.post("/transform", authenticate, transformImage);

/**
 * @route   POST /api/media/upload
 * @desc    Upload image directly to Cloudinary (server-side)
 * @access  Private
 */
router.post("/upload", authenticate, uploadImage);

/**
 * @route   GET /api/media/details/:public_id
 * @desc    Get image details from Cloudinary
 * @access  Private
 */
router.get("/details/:public_id", authenticate, getImageDetails);

export default router;
