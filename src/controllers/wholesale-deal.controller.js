import WholesaleDeal from "../models/wholesale-deal.model.js";

export const createWholesaleDeal = async (req, res) => {
  try {
    const {
      title,
      phone,
      itemPhotos,
      description,
      quantityAvailable,
      quantityUnit,
      minimumOrderQuantity,
      maximumOrderQuantity,
      price,
      orderDeadline,
      estimatedDeliveryDate,
      cod,
      moneyBackGuarantee,
      openBoxDelivery,
      freeSamples,
      isActive,
    } = req.body;

    // ✅ Basic validation
    if (
      !title ||
      !phone ||
      !quantityAvailable ||
      !minimumOrderQuantity ||
      !orderDeadline ||
      !estimatedDeliveryDate ||
      !price?.mrp ||
      !price?.dealPrice
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Create deal
    const deal = await WholesaleDeal.create({
      title,
      phone,
      itemPhotos,
      description,
      quantityAvailable,
      quantityUnit,
      minimumOrderQuantity,
      maximumOrderQuantity,
      price,
      orderDeadline,
      estimatedDeliveryDate,
      cod,
      moneyBackGuarantee,
      openBoxDelivery,
      freeSamples,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: "Wholesale deal created successfully",
      data: deal,
    });
  } catch (error) {
    console.error("Error creating deal:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while creating deal",
    });
  }
};
