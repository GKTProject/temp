import { Cashfree as CashfreePG } from "cashfree-pg";
// import { Cashfree as CashfreePayout } from "cashfree-payout";
import crypto from "crypto";
import { UserModel } from "../schema/user.schema.js";
import SubscriptionModel from "../schema/subscription.schema.js";
import { AdminModel } from "../schema/admin.schema.js";

CashfreePG.XClientId = process.env.CASHFREE_CLIENT_ID;
CashfreePG.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
CashfreePG.XEnvironment = CashfreePG.Environment.PRODUCTION;


// Function to generate the Cashfree Order ID
const generateOrderId = async () => {
  const uniqueId =  crypto.randomBytes(16).toString("hex");
  const hash =  crypto.createHash("sha256");
   hash.update(uniqueId);
  return  hash.digest("hex").slice(0, 12);
};


class CashfreeController {

  async getSessionId(req, res) {
    console.log("1. Get Session ID Process Started");
    //getUserDetails

    const userId = req.userId;
    const videoId = req.query.videoId;

    console.log("1. User ID:", userId);
    console.log("2. Video ID:", videoId);
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("2 . User found:", user.name);

      const orderId = await generateOrderId();

      // get Video from PaidBusinness from Videos in Admin
      const admin = await AdminModel.findOne({ id: 0 });
      if (!admin) {
        throw new Error("Admin not found");
      }

      const video = admin.videos.paidBusiness.find(
        (video) => video._id.toString() === videoId
      );

      if (!video) {
        throw new Error("Video not found");
      }
      const paymentAmount = video.price;

      console.log("3. Video found:", video.price);

      var refferingUser = undefined;
      if (user.referredBy != null) {
        refferingUser = await UserModel.findOne({
          referralCode: user.referredBy,
        });
      }

      console.log("4. refferingUser-", refferingUser);

      const subscription = new SubscriptionModel({
        orderId,
        user: userId,
        paymentAmount,
        purchasedVideoId: videoId,
        referBy: refferingUser ? refferingUser._id : null,
      });
      subscription.save();
      console.log("5. Subscription created", subscription);

      let request = {
        order_id: orderId,
        order_amount: paymentAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: user._id,
          customer_name: user.name,
          customer_phone: "9999999999",
          customer_email: user.email,
        },
      };

      console.log("6. Request Payload", request);

      const response = await CashfreePG.PGCreateOrder("2023-08-01", request);
      console.log("Request Completed with Status", response.status);
      console.log("Get Session ID Process Completed");
      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error creating Cashfree order", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async handleWebhook(req, res) {
    console.log("Webhook received");
    console.log(req.body);
    const order_id = req.body.data.order.order_id;
    const payment_status = req.body.data.payment.payment_status;
    const customer_id = req.body.data.customer_details.customer_id;

    console.log("Order ID:", order_id);
    console.log("Payment Status:", payment_status);
    console.log("Customer ID:", customer_id);

    try {
      if (payment_status === "SUCCESS") {
        const subscription = await SubscriptionModel.findOneAndUpdate(
          { orderId: order_id },
          { status: "PAID" },
          { new: true }
        );

        if (subscription) {
          //Subcribe the user
          const user = await UserModel.findById(customer_id);
          if (!user) {
            console.error("User not found");
            return res.status(500).send("Internal Server Error");
          }
          user.purchasedVideos.push(subscription.purchasedVideoId);
          user.save();

          var referringUser;
          //Update the referring user
          if (subscription.referBy) {
            referringUser = await UserModel.findById(subscription.referBy);
            if (!referringUser) {
              console.error("Referring user not found");
              return res.status(500).send("Internal Server Error");
            }
            referringUser.referredUsers.map((referredUser) => {
              if (referredUser.user == customer_id) {
                referredUser.subscribed = true;
                return;
              }
            });
          }

          // Distribute the payment
          const paymentAmount = subscription.paymentAmount;
          const greatKBusinessShare = subscription.referBy
            ? paymentAmount * 0.5
            : paymentAmount;
          const referringUserShare = subscription.referBy
            ? paymentAmount * 0.5
            : 0;

          // // Process the payment distribution logic here
          // console.log(`GreatK Business Share: ${greatKBusinessShare}`);
          // console.log(`Referring User Share: ${referringUserShare}`);
          if (
            subscription.referBy &&
            !subscription.referralPaid &&
            referringUserShare > 0
          ) {
            // Mark referral as paid
            if (!referringUser) {
              console.error("Referring user not found");
              return res.status(500).send("Internal Server Error");
            }
            console.log(
              `Referring user: ${referringUser.name} , Paying referral bonus`
            );
            // Pay the referral bonus

            // subscription.referralPaid = true;
            await subscription.save();
          }
        }
        console.log(`Order ${order_id} has been paid`);
      } else {
        console.log(`Order ${order_id} payment status: ${order_status}`);
      }

      res.status(200).send("Webhook received successfully");
    } catch (error) {
      console.error("Error handling webhook", error);
      res.status(500).send("Internal Server Error");
    }
  }
}

export default CashfreeController;
