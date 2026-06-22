import mongoose from "mongoose";
import WholesaleDeal from "../models/wholesale-deal.model.js";
import Business from "../models/business.model.js";
import Feed from "../models/feed.model.js";
import { Notification } from "../models/notification.model.js";


// Unified user orders across WholesaleDeal.orders[] and Business.orders[]
// Query shape is normalized for the client
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const uid = new mongoose.Types.ObjectId(userId);

    // Pipeline from WholesaleDeal
    const wholesalePipeline = [
      { $unwind: "$orders" },
      { $match: { "orders.userId": uid } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      {
        $addFields: {
          creator: { $arrayElemAt: ["$creatorInfo", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          sourceType: { $literal: "wholesale" },
          sourceId: "$_id",
          title: "$title",
          amount: "$orders.amount",
          quantity: "$orders.quantity",
          status: "$orders.status",
          orderedAt: "$orders.orderedAt",
          updatedAt: "$orders.updatedAt",
          dealerName: "$orders.dealerName",
          phone: "$phone",
          source: {
            _id: "$_id",
            title: "$title",
            images: "$images",
            category: "$category",
            price: "$price",
            phone: "$phone",
            quantityUnit: "$quantityUnit",
            orderDeadlineDate: "$orderDeadlineDate",
            estimatedDeliveryDate: "$estimatedDeliveryDate",
            dealStatus: "$dealStatus",
            userId: {
              _id: "$creator._id",
              fullName: "$creator.fullName",
              profilePhotoUrl: "$creator.profilePhotoUrl",
              phone: "$creator.phone",
            },
          },
        },
      },
    ];

    // Pipeline from Business (only if Business has orders[])
    const businessPipeline = [
      { $unwind: "$orders" },
      { $match: { "orders.userId": uid } },
      {
        $project: {
          _id: 0,
          sourceType: { $literal: "business" },
          sourceId: "$_id",
          title: "$title",
          amount: "$orders.amount",
          quantity: "$orders.quantity",
          status: "$orders.status",
          orderedAt: "$orders.orderedAt",
          updatedAt: "$orders.updatedAt",
          dealerName: "$orders.dealerName",
          phone: "$phone",
          source: {
            _id: "$_id",
            title: "$title",
            images: "$images",
            category: "$category",
            price: "$price",
            phone: "$phone",
            unit: "$unit",
            verificationStatus: "$verificationStatus",
          },
        },
      },
    ];

    // Pipeline from Feed (events) - rsvps array
    const eventPipeline = [
      { $match: { type: "event" } },
      { $unwind: "$rsvps" },
      { $match: { "rsvps.user": uid } },
      {
        $project: {
          _id: 0,
          sourceType: { $literal: "event" },
          sourceId: "$_id",
          title: "$title",
          amount: "$rsvps.price",
          quantity: "$rsvps.participants",
          status: { $literal: "registered" },
          orderedAt: "$createdAt",
          updatedAt: "$updatedAt",
          dealerName: { $literal: "" },
          phone: { $literal: "" },
          source: {
            _id: "$_id",
            title: "$title",
            images: "$images",
            eventDate: "$eventDate",
            eventTime: "$eventTime",
            location: "$location",
            registeredParticipants: "$registeredParticipants",
            maxParticipants: "$maxParticipants",
            regDeadline: "$regDeadline",
          },
        },
      },
    ];

    // Start from WholesaleDeal pipeline and union with Businesses and Events
    const businessColl = Business.collection.name; // typically 'businesses'
    const feedColl = Feed.collection.name; // typically 'feeds'

    const pipeline = [
      ...wholesalePipeline,
      {
        $unionWith: {
          coll: businessColl,
          pipeline: businessPipeline,
        },
      },
      {
        $unionWith: {
          coll: feedColl,
          pipeline: eventPipeline,
        },
      },
      { $sort: { orderedAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: "total" }, { $addFields: { page, limit } }],
        },
      },
    ];

    const result = await WholesaleDeal.aggregate(pipeline);
    const data = result[0]?.data || [];
    const meta = result[0]?.meta?.[0] || { total: 0, page, limit };

    res.status(200).json({ success: true, code: res.statusCode, data, meta });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
  }
};

// Upsert order for a WholesaleDeal: if user already ordered this deal,
// increment quantity/amount and update timestamps; else create a new sub-order.
export const upsertWholesaleOrder = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { userId, quantity = 1, amount = 0, delivery } = req.body;
    console.log("[OrderDebug] Deal ID:", dealId);
    console.log("[OrderDebug] User ID:", userId);
    console.log("[OrderDebug] Payload:", req.body);
    if (
      !mongoose.isValidObjectId(dealId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      console.log("[OrderDebug] Invalid IDs — dealId valid:", mongoose.isValidObjectId(dealId), "userId valid:", mongoose.isValidObjectId(userId));
      return res
        .status(400)
        .json({ success: false, code: res.statusCode, message: "Invalid IDs" });
    }

    const now = new Date();
    const userObjId = new mongoose.Types.ObjectId(userId);

    const dealDoc = await WholesaleDeal.findById(dealId);
    if (!dealDoc) {
      return res.status(404).json({ success: false, code: 404, message: "Deal not found" });
    }

    // Check if deadline passed
    const todayStr = new Date().toISOString().split("T")[0];
    if (todayStr > dealDoc.orderDeadlineDate) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Order deadline has passed. You cannot place or modify orders for this deal.",
      });
    }

    // Max Order Quantity Validation & remaining capacity enforcement
    const maxQty = Number(dealDoc.maximumOrderQty);
    if (maxQty && maxQty > 0) {
      // Calculate total approved/confirmed/delivered orders from OTHER users
      const totalApprovedQtyOthers = (dealDoc.orders || [])
        .filter(
          (o) =>
            o.userId.toString() !== userId.toString() &&
            (o.status === "approved" ||
              o.status === "confirmed" ||
              o.status === "delivered")
        )
        .reduce((sum, o) => sum + (o.quantity || 0), 0);

      const remainingQty = Math.max(0, maxQty - totalApprovedQtyOthers);

      if (quantity > remainingQty) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: `Cannot order more than the remaining available quantity of ${remainingQty}.`,
        });
      }
    }

    const existingOrderIndex = dealDoc.orders.findIndex(
      (o) => o.userId.toString() === userId.toString()
    );

    const defaultStatus = "approved";

    if (existingOrderIndex > -1) {
      // User is updating their order quantity or status
      if (quantity === 0) {
        // Cancel the order
        dealDoc.orders[existingOrderIndex].status = "cancelled";
        dealDoc.orders[existingOrderIndex].quantity = 0;
        dealDoc.orders[existingOrderIndex].amount = 0;
      } else {
        dealDoc.orders[existingOrderIndex].quantity = quantity;
        dealDoc.orders[existingOrderIndex].amount = quantity * (Number(dealDoc.price?.sellingPrice) || 0);
        if (dealDoc.orders[existingOrderIndex].status === "cancelled") {
          dealDoc.orders[existingOrderIndex].status = "approved";
        }
      }
      dealDoc.orders[existingOrderIndex].updatedAt = now;
      if (delivery) {
        dealDoc.orders[existingOrderIndex].delivery = delivery;
      }
    } else {
      // New order
      if (quantity > 0) {
        dealDoc.orders.push({
          userId,
          quantity,
          amount: quantity * (Number(dealDoc.price?.sellingPrice) || 0),
          dealerName: req.body.dealerName || "",
          status: defaultStatus,
          orderedAt: now,
          updatedAt: now,
          delivery: delivery || {},
        });
      }
    }

    // Recalculate currentOrderedQty (sum of all non-cancelled, non-rejected orders)
    const activeOrders = dealDoc.orders.filter(
      (o) => o.status !== "cancelled" && o.status !== "rejected"
    );
    dealDoc.currentOrderedQty = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

    // Save the deal document (runs pre-save lifecycle calculation)
    await dealDoc.save();

    const userOrder = dealDoc.orders.find((o) => o.userId.toString() === userId.toString());
    const orderDocId = userOrder?._id;
    const totalQtyForUser = userOrder?.quantity ?? 0;
    const computedTotalAmount = userOrder?.amount ?? 0;
    const orderStatus = userOrder?.status ?? "cancelled";

    // Synchronize User.orders pointer
    const pointerFilter = {
      _id: userId,
      "orders.sourceType": "wholesale",
      "orders.sourceId": new mongoose.Types.ObjectId(dealId),
    };
    const pointerSet = {
      "orders.$.quantity": totalQtyForUser,
      "orders.$.amount": computedTotalAmount,
      "orders.$.status": orderStatus,
      "orders.$.updatedAt": now,
    };
    const pointerRes = await mongoose
      .model("User")
      .updateOne(pointerFilter, { $set: pointerSet });
    if (pointerRes.matchedCount === 0) {
      await mongoose.model("User").updateOne(
        { _id: userId },
        {
          $push: {
            orders: {
              sourceType: "wholesale",
              sourceId: dealId,
              orderId: orderDocId,
              dealerName: req.body.dealerName || "",
              quantity: totalQtyForUser,
              amount: computedTotalAmount,
              status: orderStatus,
              updatedAt: now,
            },
          },
        }
      );
    }

    // Notify Dealer/Admin
    try {
      await Notification.create({
        type: "ADMIN_ALERT",
        message: `New wholesale order for ${dealDoc.title}: Qty ${totalQtyForUser}, Amount ${computedTotalAmount}`,
      });
    } catch (err) {
      console.error("Failed to create notification for wholesale order:", err);
    }

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Order updated successfully",
      orderId: orderDocId,
      quantity: totalQtyForUser,
      amount: computedTotalAmount,
      currentOrderedQty: dealDoc.currentOrderedQty,
    });
  } catch (error) {
    console.error("Error upserting wholesale order:", error);
    return res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
  }
};

// Get all registered participants for a specific event
export const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        message: "Invalid event ID",
      });
    }

    const event = await Feed.findOne(
      { _id: eventId, type: "event" },
      {
        title: 1,
        eventDate: 1,
        eventTime: 1,
        location: 1,
        price: 1,
        registeredParticipants: 1,
        maxParticipants: 1,
        minParticipants: 1,
        rsvps: 1,
      }
    ).populate("rsvps.user", "fullName phoneNumber profilePhotoUrl");

    if (!event) {
      return res.status(404).json({
        success: false,
        code: res.statusCode,
        message: "Event not found",
      });
    }

    const total = event.rsvps.length;
    const registrations = event.rsvps.slice(skip, skip + limit).map((rsvp) => ({
      userId: rsvp.user._id,
      fullName: rsvp.fullName || rsvp.user?.fullName,
      phoneNumber: rsvp.user?.phoneNumber,
      profilePhotoUrl: rsvp.profilePhotoUrl || rsvp.user?.profilePhotoUrl,
      participants: rsvp.participants,
      price: rsvp.price,
      status: "registered",
    }));

    const meta = {
      total,
      page,
      limit,
      totalParticipants: event.registeredParticipants,
      maxParticipants: event.maxParticipants,
      minParticipants: event.minParticipants,
    };

    res.status(200).json({
      success: true,
      code: res.statusCode,
      event: {
        _id: event._id,
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        location: event.location,
        price: event.price,
      },
      registrations,
      meta,
    });
  } catch (error) {
    console.error("Error fetching event registrations:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};

// Get all event registrations for a specific user
export const getUserEventOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        code: res.statusCode,
        message: "Invalid user ID",
      });
    }

    const uid = new mongoose.Types.ObjectId(userId);

    const pipeline = [
      { $match: { type: "event", "rsvps.user": uid } },
      { $unwind: "$rsvps" },
      { $match: { "rsvps.user": uid } },
      {
        $project: {
          eventId: "$_id",
          title: 1,
          eventDate: 1,
          eventTime: 1,
          location: 1,
          images: 1,
          price: "$rsvps.price",
          participants: "$rsvps.participants",
          registeredParticipants: 1,
          maxParticipants: 1,
          regDeadline: 1,
          status: { $literal: "registered" },
          registeredAt: "$createdAt",
        },
      },
      { $sort: { registeredAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: "total" }, { $addFields: { page, limit } }],
        },
      },
    ];

    const result = await Feed.aggregate(pipeline);
    const data = result[0]?.data || [];
    const meta = result[0]?.meta?.[0] || { total: 0, page, limit };

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data,
      meta,
    });
  } catch (error) {
    console.error("Error fetching user event orders:", error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      message: error.message,
    });
  }
};

export const upsertBusinessOrder = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { userId, quantity = 1, amount = 0, delivery } = req.body;

    if (
      !mongoose.isValidObjectId(businessId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, code: res.statusCode, message: "Invalid IDs" });
    }

    const now = new Date();

    const updateRes = await Business.updateOne(
      { _id: businessId, "orders.userId": new mongoose.Types.ObjectId(userId) },
      {
        $inc: { "orders.$.quantity": quantity, "orders.$.amount": amount },
        $set: { "orders.$.updatedAt": now },
      }
    );

    let orderDocId;
    if (updateRes.modifiedCount === 0) {
      const pushRes = await Business.findOneAndUpdate(
        { _id: businessId },
        {
          $push: {
            orders: {
              userId,
              quantity,
              amount,
              status: "pending",
              orderedAt: now,
              updatedAt: now,
              delivery: delivery || {},
            },
          },
        },
        { new: true, projection: { orders: 1 } }
      );
      const last = pushRes.orders[pushRes.orders.length - 1];
      orderDocId = last?.orderId || last?._id; // we defined orderId on business subdoc
    } else {
      const biz = await Business.findById(businessId, { orders: 1 });
      const found = biz.orders.find(
        (o) => o.userId.toString() === userId.toString()
      );
      orderDocId = found?.orderId || found?._id;
    }

    // Upsert pointer in User.orders
    const setUpdate = {
      "orders.$.quantity": quantity,
      "orders.$.amount": amount,
      "orders.$.status": "pending",
      "orders.$.updatedAt": now,
    };

    const userPointerUpdate = await mongoose.model("User").updateOne(
      {
        _id: userId,
        "orders.sourceType": "business",
        "orders.sourceId": new mongoose.Types.ObjectId(businessId),
      },
      { $set: setUpdate }
    );

    if (userPointerUpdate.matchedCount === 0) {
      await mongoose.model("User").updateOne(
        { _id: userId },
        {
          $push: {
            orders: {
              sourceType: "business",
              sourceId: businessId,
              orderId: orderDocId,
              quantity,
              amount,
              status: "pending",
              updatedAt: now,
            },
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      code: res.statusCode,
      message: "Order upserted",
      orderId: orderDocId,
    });

    // Notify Business Owner of new business order
    try {
      const biz = await Business.findById(businessId).select("userId title");
      if (biz && biz.userId) {
        await Notification.create({
          type: "NEW_ORDER",
          userId: biz.userId.toString(),
          message: `New order for ${biz.title}: Qty ${quantity}, Amount ${amount}`,
        });
      }
    } catch (err) {
      console.error("Failed to create notification for business order:", err);
    }


  } catch (error) {
    console.error("Error upserting business order:", error);
    return res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
  }
};

// Update a specific order's status within a WholesaleDeal.
// Recalculates deal lifecycle status automatically via pre-save hook.
export const updateOrderStatus = async (req, res) => {
  try {
    const { dealId, orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "approved", "rejected", "confirmed", "cancelled", "delivered"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    if (!mongoose.isValidObjectId(dealId) || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, code: 400, message: "Invalid IDs" });
    }

    const dealDoc = await WholesaleDeal.findById(dealId);
    if (!dealDoc) {
      return res.status(404).json({ success: false, code: 404, message: "Deal not found" });
    }

    const orderIndex = dealDoc.orders.findIndex((o) => o._id.toString() === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, code: 404, message: "Order not found" });
    }

    // Update the order status
    dealDoc.orders[orderIndex].status = status;
    dealDoc.orders[orderIndex].updatedAt = new Date();

    // Save triggers pre-save hook which recalculates deal status & currentOrderedQty
    await dealDoc.save();

    // Re-fetch with populated user data for consistent response
    const populatedDeal = await WholesaleDeal.findById(dealId)
      .populate("userId", "fullName phone profilePhotoUrl")
      .populate("orders.userId", "fullName phone profilePhotoUrl");

    // Sync the updated order status pointer in User.orders
    const updatedOrder = dealDoc.orders[orderIndex];
    if (updatedOrder?.userId) {
      const userId = updatedOrder.userId;
      await mongoose.model("User").updateOne(
        {
          _id: userId,
          "orders.sourceType": "wholesale",
          "orders.sourceId": new mongoose.Types.ObjectId(dealId),
        },
        { $set: { "orders.$.status": status, "orders.$.updatedAt": new Date() } }
      );
    }

    return res.status(200).json({
      success: true,
      code: 200,
      message: `Order status updated to ${status}`,
      deal: populatedDeal,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ success: false, code: 500, message: error.message });
  }
};

