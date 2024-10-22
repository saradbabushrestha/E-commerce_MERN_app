import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";

import {
  checkoutSucess,
  createCheckoutSession,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create-checkout-session", protectRoute, createCheckoutSession);
router.post("/checkout-sucess", protectRoute, checkoutSucess);

export default router;
