import express from "express";
import UserController from "./controllers/user.controller.js";
import AuthController from "./controllers/auth.controller.js";
import jwtAuth from "./middlewares/auth.middleware.js";
import { upload } from "./middlewares/fileUpload.middleware.js";
import CashfreeController from "./controllers/cashfree.controller.js";

const router = express.Router();
const userController = new UserController();
const authController = new AuthController();
const cashfreeController = new CashfreeController();

//Admin Auth routes
router.get("/admin/auth", jwtAuth, (req, res) => {
  authController.adminAuth(req, res);
});

router.post("/admin/signin", (req, res) => {
  authController.adminSignIn(req, res);
});

router.post("/admin/reset-password", (req, res) => {
  authController.adminResetPassword(req, res);
});

router.post("/admin/verify", (req, res) => {
  authController.adminVerify(req, res);
});

router.post("/admin/add-review", jwtAuth, (req, res) => {
  userController.addAdminReview(req, res);
});

router.get("/admin/referrals", jwtAuth, (req, res) => {
  userController.getReferralDetails(req, res);
});

//Auth routes
router.get("/auth", jwtAuth, (req, res) => {
  authController.userAuth(req, res);
});

router.post("/signup", (req, res) => {
  authController.signUp(req, res);
});

router.post("/signin", (req, res) => {
  authController.signIn(req, res);
});

router.post("/verify", (req, res) => {
  authController.verify(req, res);
});

router.post("/reset-password", (req, res) => {
  authController.resetPassword(req, res);
});

router.get("/users", jwtAuth, (req, res) => {
  userController.getAllUsers(req, res);
});

router.get("/reviews", (req, res) => {
  userController.getReviews(req, res);
});

router.post("/review", jwtAuth, (req, res) => {
  userController.addReview(req, res);
});

router.delete("/review/:index", jwtAuth, (req, res) => {
  userController.deleteReview(req, res);
});

router.put("/review/:index", jwtAuth, (req, res) => {
  userController.updateReview(req, res);
});

// router.post("/video/:index", jwtAuth, upload.single("video"), (req, res) => {
//   userController.uploadVideo(req, res);
// });

router.put("/banner/:index", jwtAuth, upload.single("banner"), (req, res) => {
  userController.uploadBanner(req, res);
});

router.get("/banners", jwtAuth, (req, res) => {
  userController.getBanners(req, res);
});

router.post(
  "/video/:index",
  jwtAuth,
  upload.fields([
    { name: "hindiVideo", maxCount: 1 },
    { name: "englishVideo", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }, // Optional thumbnail image
  ]),
  (req, res) => {
    userController.uploadVideo(req, res);
  }
);

router.get("/videos/:index", jwtAuth, (req, res) => {
  userController.getVideos(req, res);
});

router.delete("/video", jwtAuth, (req, res) => {
  userController.deleteVideo(req, res);
});

//Refferal routes
router.get("/referralcode", jwtAuth, (req, res) => {
  userController.getReferral(req, res);
});

router.post("/addUpiDetails", jwtAuth, (req, res) => {
  userController.addUpiDetails(req, res);
});

//Cashfree payment routes
// router.post("/cashfree/verifyUpiId", jwtAuth, (req, res) => {
//   cashfreeController.verifyUpiId(req, res);
// });

router.get("/cashfree/sessionid", jwtAuth, (req, res) => {
  cashfreeController.getSessionId(req, res);
});

router.post("/cashfree/webhook", (req, res) => {
  cashfreeController.handleWebhook(req, res);
});

// router.post("/cashfree/payout", (req, res) => {
//   cashfreeController.payoutReferralBonus(req, res);
// });

export default router;
