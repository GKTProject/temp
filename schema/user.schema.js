import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  purchasedVideos: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: String,
  },
  referredUsers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      time: {
        type: Date,
        default: Date.now,
      },
      subscribed: {
        type: Boolean,
        default: false,
      },
    },
  ],
  review: {
    text: {
      type: String,
    },
    time: {
      type: Date,
    },
  },
  upiDetails: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Function to generate a unique referral code
const generateReferralCode = () => {
  return crypto.randomBytes(3).toString("hex"); // Generates a 6-character hexadecimal string
};

// Pre-save middleware to generate referral code
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.referralCode) {
    let code;
    let user;
    do {
      code = generateReferralCode();
      user = await mongoose.models.User.findOne({ referralCode: code });
    } while (user);
    this.referralCode = code;
  }
  next();
});

export const UserModel = mongoose.model("User", userSchema);
