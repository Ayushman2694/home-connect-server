import cloudinary from "../utils/cloudinaryConfig.js";

/**
 * Generate signed upload parameters for Cloudinary
 * This keeps your API secret secure on the server
 * Frontend uses these parameters to upload directly to Cloudinary
 */
export const signUpload = async (req, res) => {
  try {
    console.log("Media sign request received:", req.body);

    const { folder } = req.body;
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Parameters for the upload (these will be included in the signature)
    const uploadParams = {
      timestamp: timestamp,
      ...(folder && { folder }), // Optional folder organization
    };

    console.log("Upload params:", uploadParams);

    // Generate signature using Cloudinary's built-in method (more reliable)
    const signature = cloudinary.utils.api_sign_request(
      uploadParams,
      process.env.CLOUDINARY_API_SECRET
    );

    console.log("Generated signature:", signature);

    // Return the parameters needed for upload
    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        timestamp,
        signature,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        folder: folder || undefined,
      },
    });
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to generate upload signature",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete image from Cloudinary
 * Optional: if you want server-side deletion
 */
export const deleteImage = async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "public_id is required",
      });
    }

    const result = await cloudinary.uploader.destroy(public_id);

    console.log("Delete result:", result);
    if (result.result === "ok") {
      res.status(200).json({
        success: true,
        code: res.statusCode,
        message: "Image deleted successfully",
        result,
      });
    } else {
      res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Failed to delete image",
        result,
      });
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to delete image",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get optimized image URL with transformations
 * Optional: if you want server-side URL generation
 */
export const transformImage = (req, res) => {
  try {
    const { public_id, width, height, crop, quality, format } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "public_id is required",
      });
    }

    const transformations = {};
    if (width) transformations.width = width;
    if (height) transformations.height = height;
    if (crop) transformations.crop = crop;
    if (quality) transformations.quality = quality;
    if (format) transformations.format = format;

    const url = cloudinary.url(public_id, transformations);

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        url,
        public_id,
        transformations,
      },
    });
  } catch (error) {
    console.error("Error generating transformed URL:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to generate transformed URL",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Upload image directly to Cloudinary (alternative approach)
 * If you prefer server-side upload instead of direct frontend upload
 */
export const uploadImage = async (req, res) => {
  try {
    const { image, folder } = req.body; // base64 or file path

    if (!image) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "Image data is required",
      });
    }

    const uploadOptions = {
      ...(folder && { folder }),
      quality: "auto",
      fetch_format: "auto",
      resource_type: "image",
    };

    const result = await cloudinary.uploader.upload(image, uploadOptions);

    res.status(200).json({
      success: true,
      code: res.statusCode,
      message: "Image uploaded successfully",
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to upload image",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get image details from Cloudinary
 */
export const getImageDetails = async (req, res) => {
  try {
    const { public_id } = req.params;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        error: "public_id is required",
      });
    }

    const result = await cloudinary.api.resource(public_id);

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
      },
    });
  } catch (error) {
    console.error("Error getting image details:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: "Failed to get image details",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
