const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
console.log('🔍 Change password/PIN router created');
console.log('🔍 Router type:', typeof router);
console.log('🔍 Router is Express Router:', router.constructor.name);

// Change Password Endpoint
router.put("/change-password", authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both old and new password are required",
      });
    }

    // Validate password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Fetch user including password
    const user = await User.findById(req.user.userId).select("+password");
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: "Old password is incorrect" 
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    // Set new password directly; pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password updated for user: ${user.email}`);

    res.status(200).json({ 
      success: true, 
      message: "Password updated successfully" 
    });

  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error updating password" 
    });
  }
});

// Change PIN Endpoint
router.put("/change-pin", authenticate, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: "Both old and new PIN are required",
      });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits",
      });
    }

    // Check if new PIN is different from old PIN
    if (oldPin === newPin) {
      return res.status(400).json({
        success: false,
        message: "New PIN must be different from old PIN",
      });
    }

    // Fetch user including PIN
    const user = await User.findById(req.user.userId).select("+pin");
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if user has a PIN set
    if (!user.pin) {
      return res.status(400).json({
        success: false,
        message: "No PIN set for this account. Please set a PIN first.",
      });
    }

    // Verify old PIN
    const isMatch = await bcrypt.compare(oldPin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: "Old PIN is incorrect" 
      });
    }

    // Set new PIN directly; pre-save hook will hash it
    user.pin = newPin;
    await user.save();

    console.log(`✅ PIN updated for user: ${user.email}`);

    res.status(200).json({ 
      success: true, 
      message: "PIN updated successfully" 
    });

  } catch (error) {
    console.error("Change PIN error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error updating PIN" 
    });
  }
});

console.log('🔍 Router has', router.stack ? router.stack.length : 0, 'routes');
if (router.stack) {
  router.stack.forEach((layer, i) => {
    if (layer.route) {
      console.log(`  Route ${i}:`, Object.keys(layer.route.methods).join(',').toUpperCase(), layer.route.path);
    }
  });
}
// THIS WAS MISSING - EXPORT THE ROUTER!
module.exports = router;