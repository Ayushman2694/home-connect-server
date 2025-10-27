import mongoose from "mongoose";
import WholesaleDeal from "../models/wholesale-deal.model.js";
import Business from "../models/business.model.js";

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

    // Start from WholesaleDeal pipeline and union with Businesses
    const unionColl = Business.collection.name; // typically 'businesses'

    const pipeline = [
      ...wholesalePipeline,
      {
        $unionWith: {
          coll: unionColl,
          pipeline: businessPipeline,
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
    if (
      !mongoose.isValidObjectId(dealId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, code: res.statusCode, message: "Invalid IDs" });
    }

    const now = new Date();
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Fetch unit selling price once to compute totals reliably
    const dealDocForPrice = await WholesaleDeal.findById(dealId, {
      "price.sellingPrice": 1,
    });
    const unitSellingPrice = Number(dealDocForPrice?.price?.sellingPrice) || 0;

    // Try to update an existing order by this user on the same deal (increment quantity only)
    const updateRes = await WholesaleDeal.updateOne(
      { _id: dealId, "orders.userId": userObjId },
      {
        $inc: { "orders.$.quantity": quantity },
        $set: { "orders.$.updatedAt": now },
      }
    );

    if (updateRes.modifiedCount === 0) {
      // No existing order – push a new one with computed amount
      await WholesaleDeal.updateOne(
        { _id: dealId },
        {
          $push: {
            orders: {
              userId,
              quantity,
              amount: quantity * unitSellingPrice,
              status: "pending",
              orderedAt: now,
              updatedAt: now,
              delivery: delivery || {},
            },
          },
        }
      );
    }

    // Fetch the updated sub-order for this user to get absolute totals and id
    const updatedDoc = await WholesaleDeal.findOne(
      { _id: dealId, "orders.userId": userObjId },
      { "orders.$": 1 }
    );
    const userOrder = updatedDoc?.orders?.[0];
    const orderDocId = userOrder?._id;
    const totalQtyForUser = userOrder?.quantity ?? quantity;
    const computedTotalAmount = totalQtyForUser * unitSellingPrice;

    // Ensure stored sub-order amount equals computed total (absolute set, not increment)
    if (orderDocId) {
      await WholesaleDeal.updateOne(
        { _id: dealId, "orders._id": orderDocId },
        { $set: { "orders.$.amount": computedTotalAmount } }
      );
    }

    // Maintain User.orders pointer with absolute totals
    const pointerFilter = {
      _id: userId,
      "orders.sourceType": "wholesale",
      "orders.sourceId": new mongoose.Types.ObjectId(dealId),
    };
    const pointerSet = {
      "orders.$.quantity": totalQtyForUser,
      "orders.$.amount": computedTotalAmount,
      "orders.$.status": userOrder?.status || "pending",
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
              quantity: totalQtyForUser,
              amount: computedTotalAmount,
              status: userOrder?.status || "pending",
              updatedAt: now,
            },
          },
        }
      );
    }

    // Recalculate and update currentOrderedQty on the deal (sum of all orders' quantities)
    const sumAgg = await WholesaleDeal.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(dealId) } },
      { $unwind: { path: "$orders", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          totalQty: { $sum: { $ifNull: ["$orders.quantity", 0] } },
        },
      },
    ]);
    const totalQty = sumAgg[0]?.totalQty || 0;
    await WholesaleDeal.updateOne(
      { _id: dealId },
      { $set: { currentOrderedQty: totalQty } }
    );

    return res.status(200).json({
      success: true,
      code: res.statusCode,
      message: "Order upserted",
      orderId: orderDocId,
      quantity: totalQtyForUser,
      amount: computedTotalAmount,
      currentOrderedQty: totalQty,
    });
  } catch (error) {
    console.error("Error upserting wholesale order:", error);
    return res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
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
  } catch (error) {
    console.error("Error upserting business order:", error);
    return res
      .status(500)
      .json({ success: false, code: res.statusCode, message: error.message });
  }
};
