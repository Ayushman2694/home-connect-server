import Request from "../models/request.model.js";

export const getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find().populate("user");
    res.json({ success: true, requests });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        error: `error in getAllRequests controller: ${error.message}`,
      });
  }
};

export const createRequest = async (req, res) => {
  try {
    const { user, status, message } = req.body;
    const newRequest = new Request({ user, status, message });
    if(!newRequest){
        res.status(400).json({ success: false, error: 'Failed to create request' });
    }
    await newRequest.save();
    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: `error in createRequest controller: ${error.message}` });
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
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: `error in updateRequest controller: ${error.message}` });
  }
};

