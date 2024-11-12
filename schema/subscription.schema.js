import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  status: { type: String, default: "PENDING" },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  purchasedVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  paymentAmount: {
    type: Number,
    required: true,
  },
  referBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Referring user
  referralPaid: {
    type: Boolean,
    default: false,
  }, // Track referral payment status
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);

export default SubscriptionModel;
