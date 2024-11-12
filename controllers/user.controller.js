import { AdminModel } from "../schema/admin.schema.js";
import { UserModel } from "../schema/user.schema.js";
import fs from "fs";
import axios from "axios";
import SubscriptionModel from "../schema/subscription.schema.js";

function deleteUploadedFile(file) {
  if (file == null) return;
  fs.unlink(file.path, (err) => {
    if (err) {
      console.log(`Failed to delete file: ${file.path}`, err);
    } else {
      console.log(`Deleted file: ${file.path}`);
    }
  });
}

class UserController {
  //Admin Routes
  async getAllUsers(req, res) {
    try {
      const id = req.userId;
      if (req.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized Access" });
      }
      const admin = await AdminModel.findOne({ _id: id });
      if (!admin) {
        return res.status(404).json({ message: "Not Authorized" });
      }
      // Get All User Details (Except Password)   Sort Opposite of Created At
      const users = await UserModel.find({}, "-password").sort({
        createdAt: -1,
      });

      if (!users || users.length < 1) {
        return res.status(404).json({ message: "No Users Found" });
      }
      res.status(200).json(users);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async addAdminReview(req, res) {
    try {
      const { username, review } = req.body;
      const id = req.userId;

      if (!review && !username) {
        return res
          .status(400)
          .json({ message: "Review & Username is required " });
      }

      if (!id) {
        return res.status(400).json({ message: "Unauthorized Access" });
      }

      const admin = await AdminModel.findById(id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const reviewDetails = {
        user: id,
        username: username,
        text: review,
        time: new Date(Date.now()),
      };

      admin.reviews.push(reviewDetails);
      await admin.save();
      res.status(201).json({ message: "Review added successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getReviews(req, res) {
    try {
      //Get only reviews from adminModel
      const data = await AdminModel.findOne({ id: 0 }, "reviews");
      if (!data || data.reviews.length < 1) {
        return res.status(404).json({ message: "No reviews found" });
      }

      res.status(200).json(data.reviews);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async addReview(req, res) {
    try {
      const { review } = req.body;
      const id = req.userId;

      if (!review) {
        return res.status(400).json({ message: "Review is required" });
      }

      if (!id) {
        return res.status(400).json({ message: "Unauthorized Access" });
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.review = {
        text: review,
        time: new Date(Date.now()),
      };
      await user.save();

      //Get the adminModel
      const admin = await AdminModel.findOne({ id: 0 });
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      //FInd in Admin if Review already exist for the User
      var reviewPresent = false;
      admin.reviews.forEach((rev) => {
        if (rev.user == id) {
          reviewPresent = true;
          rev.text = review;
          rev.time = user.review.time;
          rev.user = user._id;
          rev.username = user.name;
        }
      });

      if (!reviewPresent) {
        //Add the review
        admin.reviews.push({
          text: review,
          time: user.review.time,
          user: user._id,
          username: user.name,
        });
      }

      await admin.save();

      res.status(200).json({ message: "Review added successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async deleteReview(req, res) {
    //Admin and User who created the review can delete the review
    const { index } = req.params;
    const id = req.userId;
    try {
      if (req.role == "admin") {
        const admin = await AdminModel.findOne({ _id: id });
        if (!admin) {
          return res.status(404).json({ message: "Admin not found" });
        }

        if (admin.reviews.length < index) {
          return res.status(404).json({ message: "Review not found" });
        }
        //Delete review from User Model
        const user = await UserModel.findById(admin.reviews[index].user);
        if (user) {
          user.review = null;
          await user.save();
        }
        admin.reviews.splice(index, 1);
        await admin.save();

        return res.status(200).json({ message: "Review deleted successfully" });
      }
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.review.text) {
        return res.status(404).json({ message: "Review not found" });
      }
      user.review = null;
      await user.save();
      return res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async updateReview(req, res) {
    //Admin and User who created the review can update the review
    const { review } = req.body;
    const { index } = req.params;
    const id = req.userId;
    try {
      if (req.role == "admin") {
        const admin = await AdminModel.findOne({ _id: id });
        if (!admin) {
          return res.status(404).json({ message: "Admin not found" });
        }

        if (admin.reviews.length <= index) {
          return res.status(404).json({ message: "Review not found" });
        }
        admin.reviews[index].text = review;
        admin.reviews[index].time = new Date(Date.now());
        await admin.save();

        //Update review in User Model
        const user = await UserModel.findById(admin.reviews[index].user);
        if (user) {
          user.review.text = admin.reviews[index].text;
          user.review.time = admin.reviews[index].time;
          await user.save();
        }

        return res.status(200).json({ message: "Review updated successfully" });
      }
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.review.text = review;
      user.review.time = new Date(Date.now());
      await user.save();
      //Update review in Admin Model
      const admin = await AdminModel.findOne({ "reviews.user": id });
      if (admin) {
        admin.reviews.forEach((rev) => {
          if (rev.user == id) {
            rev.text = review;
            rev.time = user.review.time;
          }
        });
        await admin.save();
      }
      return res.status(200).json({ message: "Review updated successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async uploadBanner(req, res) {
    const { index } = req.params;
    const banner = req.file ? req.file : null;

    // check if Banner and Index are present
    if (index < 0 || index > 2 || !banner) {
      deleteUploadedFile(banner);
      return res
        .status(400)
        .json({ message: "Banner and Index (between 1 - 3) are required" });
    }

    try {
      if (req.role !== "admin") {
        deleteUploadedFile(banner);
        return res.status(401).json({ message: "Unauthorized Access" });
      }

      const admin = await AdminModel.findOne({ _id: req.userId });

      if (!admin) {
        deleteUploadedFile(banner);
        return res.status(404).json({ message: "Admin not found" });
      }

      if (index == 0) {
        //Delete the old banner
        deleteUploadedFile({ path: admin.banners.freeBusinessBannerPath });
        //Save the new banner
        admin.banners.freeBusinessBannerPath = banner.path;
      } else if (index == 1) {
        deleteUploadedFile({ path: admin.banners.paidBusinessBannerPath });
        //Save the new banner
        admin.banners.paidBusinessBannerPath = banner.path;
      } else if (index == 2) {
        deleteUploadedFile({ path: admin.banners.freeGreatKBannerPath });
        admin.banners.freeGreatKBannerPath = banner.path;
      } else {
        deleteUploadedFile(banner);
        return res.status(400).json({ message: "Invalid Index" });
      }

      await admin.save();

      res.status(200).json({ message: "Banner uploaded successfully" });
    } catch (error) {
      deleteUploadedFile(banner);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getBanners(req, res) {
    try {
      const adminBanners = await AdminModel.findOne({ id: 0 }, "banners");
      if (!adminBanners) {
        return res.status(404).json({ message: "Banners not found" });
      }
      res.status(200).json(adminBanners.banners);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async uploadVideo(req, res) {
    //Admin can upload videos ( 0-FreeBusiness, 1-PaidBusiness, 2-FreeGreatK )
    const { index } = req.params;
    const videoHindi = req.files.hindiVideo ? req.files.hindiVideo[0] : null;
    const videoEnglish = req.files.englishVideo
      ? req.files.englishVideo[0]
      : null;
    const thumbnail = req.files.thumbnail ? req.files.thumbnail[0] : null;
    const text = req.body.text;
    const price = req.body.price;

    //return res.status(200).json({ message : "Video uploaded successfully" });

    if (index < 0 || index > 2) {
      deleteUploadedFile(videoEnglish);
      deleteUploadedFile(videoHindi);
      deleteUploadedFile(thumbnail);
      return res.status(400).json({ message: "Invalid Index" });
    }

    if (!videoHindi || !videoEnglish || !text) {
      deleteUploadedFile(videoEnglish);
      deleteUploadedFile(videoHindi);
      deleteUploadedFile(thumbnail);
      return res
        .status(400)
        .json({ message: "Both Hindi English Video and text is required" });
    }

    try {
      if (req.role !== "admin") {
        deleteUploadedFile(videoEnglish);
        deleteUploadedFile(videoHindi);
        deleteUploadedFile(thumbnail);
        return res.status(401).json({ message: "Unauthorized Access" });
      }

      const admin = await AdminModel.findOne({ _id: req.userId });

      if (!admin) {
        deleteUploadedFile(videoEnglish);
        deleteUploadedFile(videoHindi);
        deleteUploadedFile(thumbnail);
        return res.status(404).json({ message: "Admin not found" });
      }

      const videoDetails = {
        hindiFilePath: videoHindi.path,
        englishFilePath: videoEnglish.path,
        thumbnailFilePath: thumbnail ? thumbnail.path : null,
        text: text,
        price: price,
      };

      if (index == 0) {
        admin.videos.freeBusiness.push(videoDetails);
      } else if (index == 1) {
        admin.videos.paidBusiness.push(videoDetails);
      } else {
        admin.videos.freeGreatK.push(videoDetails);
      }
      await admin.save();

      res.status(200).json({ message: "Video uploaded successfully" });
    } catch (error) {
      deleteUploadedFile(videoEnglish);
      deleteUploadedFile(videoHindi);
      deleteUploadedFile(thumbnail);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getVideos(req, res) {
    const { index } = req.params;
    try {
      if (index < 0 || index > 2) {
        return res.status(400).json({ message: "Invalid Index" });
      }

      //Get only videos from adminModel
      const admin = await AdminModel.findOne({ id: 0 }, "videos");
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      let videos = [];
      if (index == 0) {
        videos = admin.videos.freeBusiness;
      } else if (index == 1) {
        //Check if user subscribed to paid business
        if (req.role !== "admin") {
          const user = await UserModel.findById(req.userId);

          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }
          // if (!user.subscribed) {
          //   return res.status(401).json({
          //     message: "Subscribe to our Paid Business to See Videos",
          //   });
          // }
          for (var i = 0; i < admin.videos.paidBusiness.length; i++) {
            if (
              user.purchasedVideos.includes(admin.videos.paidBusiness[i]._id)
            ) {
              videos.push(admin.videos.paidBusiness[i]);
            } else {
              videos.push({
                hindiFilePath: "",
                englishFilePath: "",
                thumbnailFilePath:
                  admin.videos.paidBusiness[i].thumbnailFilePath,
                text: admin.videos.paidBusiness[i].text,
                price: admin.videos.paidBusiness[i].price,
                _id: admin.videos.paidBusiness[i]._id,
              });
            }
          }
        } else {
          if (admin._id != req.userId) {
            return res.status(401).json({ message: "Unauthorized Access" });
          }
          videos = admin.videos.paidBusiness;
        }
      } else if (index == 2) {
        videos = admin.videos.freeGreatK;
      }

      if (videos.length < 1) {
        return res.status(201).json({ message: "No videos found" });
      }

      res.status(200).json({ videoDetails: videos });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async deleteVideo(req, res) {
    const { index, videoIndex } = req.query;
    try {
      if (index < 0 || index > 2) {
        return res.status(400).json({ message: "Invalid Index" });
      }
      if (req.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized Access" });
      }

      const admin = await AdminModel.findOne({ _id: req.userId });
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      let videos = [];
      if (index == 0) {
        videos = admin.videos.freeBusiness;
      } else if (index == 1) {
        videos = admin.videos.paidBusiness;
      } else if (index == 2) {
        videos = admin.videos.freeGreatK;
      }
      if (videos.length <= videoIndex) {
        return res.status(404).json({ message: "Video not found" });
      }
      const video = videos[videoIndex];
      fs.unlink(video.hindiFilePath, (err) => {
        if (err) {
          console.log(`Failed to delete file: ${video.hindiFilePath}`, err);
        } else {
          console.log(`Deleted file: ${video.hindiFilePath}`);
        }
      });
      fs.unlink(video.englishFilePath, (err) => {
        if (err) {
          console.log(`Failed to delete file: ${video.hindiFilePath}`, err);
        } else {
          console.log(`Deleted file: ${video.hindiFilePath}`);
        }
      });
      videos.splice(videoIndex, 1);
      await admin.save();
      res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getReferral(req, res) {
    try {
      const id = req.userId;
      if (!id) {
        return res.status(400).json({ message: "Unauthorized Access" });
      }
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      if (user.upiDetails) {
        return res.status(200).json({
          upiDetails: user.upiDetails,
          referralCode: user.referralCode,
        });
      }
      return res.status(404).json({ message: "UPI Details not found" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async addUpiDetails(req, res) {
    try {
      const id = req.userId;
      const { upiDetails } = req.body;
      if (!id) {
        return res.status(400).json({ message: "Unauthorized Access" });
      }
      if (!upiDetails) {
        return res.status(400).json({ message: "UPI Details are required" });
      }

      //Validate UPI Details using RazorPay using axios
      console.log(upiDetails);
      try {
        const response = await axios.post(
          `https://api.razorpay.com/v1/payments/validate/account?key_id=${process.env.RAZORPAY_KEY_ID}`,
          {
            entity: "vpa",
            value: upiDetails,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.data;

        console.log(data);

        if (!data.success) {
          return res.status(403).json({ message: "Invalid UPI Details" });
        }
      } catch (error) {
        return res.status(403).json({ message: "Invalid UPI Details" });
      }

      // const razorpay = new Razorpay({
      //   key_id: process.env.RAZORPAY_KEY_ID,
      //   key_secret: process.env.RAZORPAY_KEY_SECRET,
      // });

      // const response = await razorpay.payments.validateVpa({ vpa: upiDetails });

      // if (!response) {
      //   return res.status(400).json({ message: "Invalid UPI Details" });
      // }

      // console.log(response);

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.upiDetails = upiDetails;
      await user.save();
      res.status(200).json({ message: "UPI Details Verified Successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getReferralDetails(req, res) {
    try {
      const id = req.userId;
      if (!id) {
        return res.status(400).json({ message: "Unauthorized Access" });
      }
      if (req.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized Access" });
      }
      const admin = await AdminModel.findById(id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const subscriptions = await SubscriptionModel.find({})
        .populate("user", "_id name email")
        .populate("referBy", "_id name email upiDetails");

      // Manually calculate the amountUserGet field for each subscription
      const subscriptionsWithAmountUserGet = subscriptions
        .filter((subscription) => subscription.referBy != null) // Filter out subscriptions with null referBy
        .map((subscription) => {
          // Convert the document to a plain JavaScript object to avoid mutation issues
          const subscriptionObj = subscription.toObject();
          // Calculate the amountUserGet
          subscriptionObj.amountUserGet = subscription.paymentAmount * 0.5;
          return subscriptionObj;
        });

      res.status(200).json(subscriptionsWithAmountUserGet);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
export default UserController;
