import { Router } from "express";
import {
  getCurrentUser,
  listSecurityQuestions,
  loginUser,
  logoutUser,
  registerUser,
  resetPasswordAfterRecovery,
  startPasswordRecovery,
  updateSecurityQuestion,
  verifyPasswordRecovery,
} from "../controllers/users.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/security-questions", listSecurityQuestions);
router.put("/security-question", updateSecurityQuestion);
router.post("/recover-password/email", startPasswordRecovery);
router.post("/recover-password/verify", verifyPasswordRecovery);
router.post("/recover-password/reset", resetPasswordAfterRecovery);
router.post("/logout", logoutUser);
router.get("/me", getCurrentUser);

export default router;
