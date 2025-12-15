const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Validation middleware
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, underscores, and hyphens')
    .toLowerCase(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .matches(/^\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('emailOrPhone')
    .trim()
    .notEmpty()
    .withMessage('Email or phone is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const pinValidation = [
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  
  body('confirmPin')
    .matches(/^\d{4}$/)
    .withMessage('Confirm PIN must be exactly 4 digits')
    .custom((value, { req }) => {
      if (value !== req.body.pin) {
        throw new Error('PIN confirmation does not match');
      }
      return true;
    })
];

// Signup handler function (to avoid duplication)
const handleSignup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, username, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
        { phone: phone.replace(/[\s\-\(\)]/g, '') }
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email.toLowerCase()) {
        message = 'Email is already registered';
      } else if (existingUser.username === username.toLowerCase()) {
        message = 'Username is already taken';
      } else if (existingUser.phone === phone.replace(/[\s\-\(\)]/g, '')) {
        message = 'Phone number is already registered';
      }
      
      return res.status(409).json({
        success: false,
        message
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: phone.replace(/[\s\-\(\)]/g, ''),
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Log successful registration
    console.log(`✅ New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isPinSetup: user.isPinSetup,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already registered`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', authLimiter, signupValidation, handleSignup);

// @route   POST /api/auth/register
// @desc    Register a new user (alias for signup)
// @access  Public
router.post('/register', authLimiter, signupValidation, handleSignup);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { emailOrPhone, password } = req.body;

    // Find user by email or phone
    const user = await User.findByEmailOrPhone(emailOrPhone).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    // Log successful login
    console.log(`✅ User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isPinSetup: user.isPinSetup,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/setup-pin
// @desc    Setup user transaction PIN
// @access  Private
router.post('/setup-pin', authenticate, pinValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { pin, confirmPin } = req.body;
    const userId = req.user.userId;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if PIN is already set up
    if (user.isPinSetup) {
      return res.status(409).json({
        success: false,
        message: 'PIN has already been set up for this account'
      });
    }

    // Check for weak PINs
    const weakPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321'];
    if (weakPins.includes(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a stronger PIN. Avoid sequential numbers or repeated digits.'
      });
    }

    // Set PIN and mark as setup
    user.pin = pin;
    user.isPinSetup = true;
    await user.save();

    // Log successful PIN setup
    console.log(`✅ PIN setup completed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'PIN setup completed successfully',
      user: {
        id: user._id,
        name: user.name,
        isPinSetup: user.isPinSetup
      }
    });

  } catch (error) {
    console.error('PIN setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during PIN setup'
    });
  }
});

// @route   POST /api/auth/verify-pin
// @desc    Verify user transaction PIN
// @access  Private
router.post('/verify-pin', authenticate, async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits'
      });
    }

    // Get user with PIN
    const user = await User.findById(userId).select('+pin');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isPinSetup || !user.pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN has not been set up yet'
      });
    }

    // Verify PIN
    const isPinValid = await user.comparePin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully'
    });

  } catch (error) {
    console.error('PIN verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during PIN verification'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
// Backend - Complete Profile Routes

// GET route for fetching user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    console.log('=== GET PROFILE ROUTE DEBUG ===');
    console.log('req.user:', req.user);
    console.log('userId from req.user:', req.user?.userId);
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    const user = await User.findById(req.user.userId);
    console.log('Database query result:', user ? 'User found' : 'User not found');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isPinSetup: user.isPinSetup,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// PUT route for updating user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    console.log('=== PUT PROFILE ROUTE DEBUG ===');
    console.log('req.user:', req.user);
    console.log('req.body:', req.body);
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    const { name, username, email, phone } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if username is already taken (if username is being changed)
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user.userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Check if email is already taken (if email is being changed)
    const existingEmailUser = await User.findOne({ 
      email, 
      _id: { $ne: req.user.userId } 
    });
    
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already taken'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        name, 
        username, 
        email, 
        phone 
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Profile updated successfully for user:', updatedUser._id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isPinSetup: updatedUser.isPinSetup,
        isEmailVerified: updatedUser.isEmailVerified,
        isPhoneVerified: updatedUser.isPhoneVerified,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset with deep link support
// @access  Public
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    if (!emailOrPhone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required'
      });
    }

    // Find user
    const user = await User.findByEmailOrPhone(emailOrPhone);
    
    if (!user) {
      // Don't reveal if user exists or not (security)
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Create deep link URL that will work with your app
    // This format: connectpay://reset-password?token=xxx
    const deepLinkUrl = `connectpay://reset-password?token=${resetToken}`;
    
    // Alternative universal link (if you have a web domain)
    const universalLinkUrl = `https://connectpay.app/reset-password?token=${resetToken}`;
    
    // Web fallback
    const webResetUrl = `${process.env.FRONTEND_URL || 'https://vtu-application.onrender.com'}/reset-password?token=${resetToken}`;

    // Enhanced email content
    const message = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Password Reset Request - ConnectPay',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .header { 
              background: linear-gradient(135deg, #ff2b2b 0%, #ff4444 100%);
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .header p {
              margin: 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content { 
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #333;
            }
            .message {
              font-size: 15px;
              color: #666;
              margin-bottom: 25px;
              line-height: 1.8;
            }
            .method-box {
              background: #f8f9fa;
              border-radius: 10px;
              padding: 25px;
              margin: 25px 0;
              border: 1px solid #e9ecef;
            }
            .method-title {
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            }
            .method-icon {
              font-size: 24px;
              margin-right: 10px;
            }
            .method-steps {
              margin: 15px 0;
              padding-left: 10px;
            }
            .method-steps ol {
              margin: 0;
              padding-left: 20px;
              color: #666;
            }
            .method-steps li {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .button-container {
              text-align: center;
              margin: 20px 0;
            }
            .button { 
              display: inline-block;
              background: linear-gradient(135deg, #ff2b2b 0%, #ff4444 100%);
              color: #ffffff !important;
              padding: 16px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(255, 43, 43, 0.3);
              transition: all 0.3s ease;
              border: none;
              cursor: pointer;
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(255, 43, 43, 0.4);
            }
            .divider {
              text-align: center;
              margin: 30px 0;
              position: relative;
            }
            .divider::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 0;
              right: 0;
              height: 1px;
              background: #dee2e6;
            }
            .divider span {
              background: white;
              padding: 0 15px;
              position: relative;
              color: #6c757d;
              font-size: 13px;
              font-weight: 600;
            }
            .code-section {
              background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
              border: 2px dashed #ff2b2b;
              border-radius: 10px;
              padding: 25px;
              margin: 20px 0;
              text-align: center;
            }
            .code-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .code { 
              font-family: 'Courier New', Courier, monospace;
              font-size: 22px;
              color: #ff2b2b;
              font-weight: bold;
              letter-spacing: 3px;
              word-break: break-all;
              user-select: all;
              padding: 10px;
              background: white;
              border-radius: 6px;
              display: inline-block;
            }
            .copy-hint {
              font-size: 12px;
              color: #999;
              margin-top: 10px;
              font-style: italic;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 25px 0;
              border-radius: 6px;
            }
            .warning-content {
              display: flex;
              align-items: flex-start;
            }
            .warning-icon {
              font-size: 24px;
              margin-right: 12px;
              flex-shrink: 0;
            }
            .warning-text {
              font-size: 14px;
              color: #856404;
              line-height: 1.6;
            }
            .footer { 
              text-align: center;
              padding: 30px 20px;
              background: #f8f9fa;
              border-top: 1px solid #dee2e6;
            }
            .footer-logo {
              font-size: 20px;
              font-weight: 700;
              color: #ff2b2b;
              margin-bottom: 10px;
            }
            .footer p {
              margin: 5px 0;
              font-size: 13px;
              color: #6c757d;
            }
            .help-section {
              background: #e3f2fd;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              border-left: 4px solid #2196f3;
            }
            .help-section h4 {
              margin: 0 0 10px 0;
              font-size: 15px;
              color: #1976d2;
            }
            .help-section p {
              margin: 0;
              font-size: 14px;
              color: #666;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 0;
                border-radius: 0;
              }
              .header {
                padding: 30px 20px;
              }
              .header h1 {
                font-size: 24px;
              }
              .content {
                padding: 30px 20px;
              }
              .method-box {
                padding: 20px 15px;
              }
              .button {
                padding: 14px 30px;
                font-size: 15px;
                width: 100%;
              }
              .code {
                font-size: 18px;
                letter-spacing: 2px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>Secure password reset for your ConnectPay account</p>
            </div>
            
            <div class="content">
              <p class="greeting">Hello ${user.name},</p>
              
              <p class="message">
                We received a request to reset your ConnectPay account password. 
                Choose any of the methods below to reset your password securely.
              </p>

              <!-- Method 1: Mobile App Button -->
              <div class="method-box">
                <div class="method-title">
                  <span class="method-icon">📱</span>
                  <span>Method 1: Open in Mobile App (Recommended)</span>
                </div>
                <div class="method-steps">
                  <ol>
                    <li>Click the button below</li>
                    <li>Your ConnectPay app will open automatically</li>
                    <li>Enter your new password and confirm</li>
                  </ol>
                </div>
                <div class="button-container">
                  <a href="${deepLinkUrl}" class="button">🚀 Open ConnectPay App</a>
                </div>
                <p style="text-align: center; font-size: 12px; color: #999; margin-top: 10px;">
                  Works best on mobile devices with the app installed
                </p>
              </div>

              <div class="divider"><span>OR</span></div>

              <!-- Method 2: Manual Code -->
              <div class="method-box">
                <div class="method-title">
                  <span class="method-icon">🔢</span>
                  <span>Method 2: Use Reset Code</span>
                </div>
                <div class="method-steps">
                  <ol>
                    <li>Open the ConnectPay app on your device</li>
                    <li>Navigate to "Reset Password" screen</li>
                    <li>Copy and paste the code below</li>
                  </ol>
                </div>
                <div class="code-section">
                  <div class="code-label">Your Password Reset Code</div>
                  <div class="code">${resetToken}</div>
                  <p class="copy-hint">Tap to select and copy</p>
                </div>
              </div>

              <!-- Security Warning -->
              <div class="warning">
                <div class="warning-content">
                  <span class="warning-icon">⚠️</span>
                  <div class="warning-text">
                    <strong>Security Notice:</strong><br>
                    • This reset code expires in <strong>30 minutes</strong><br>
                    • If you didn't request this, ignore this email<br>
                    • Never share this code with anyone<br>
                    • Our team will never ask for this code
                  </div>
                </div>
              </div>

              <!-- Help Section -->
              <div class="help-section">
                <h4>💬 Need Help?</h4>
                <p>
                  If you're having trouble resetting your password or didn't request this change, 
                  please contact our support team immediately.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="footer-logo">ConnectPay</div>
              <p><strong>Secure Digital Payments</strong></p>
              <p>© ${new Date().getFullYear()} ConnectPay. All rights reserved.</p>
              <p style="margin-top: 15px; font-size: 12px;">
                This is an automated security email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    await sgMail.send(message);

    console.log(`✅ Password reset email sent to: ${user.email}`);
    console.log(`🔗 Deep link generated: ${deepLinkUrl}`);

    res.status(200).json({
      success: true,
      message: 'A password reset link has been sent to your email. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    
    // Handle SendGrid errors
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error sending password reset email. Please try again later.'
    });
  }
});


// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    console.log('🔄 Reset password request received');
    console.log('📥 Request body:', { token: req.body.token ? 'present' : 'missing', newPassword: req.body.newPassword ? 'present' : 'missing' });
    
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
      console.log('❌ Missing token or password');
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    console.log('🔐 Hashed token for lookup');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ No user found with valid token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset link.'
      });
    }

    console.log('✅ Valid token found for user:', user.email);

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.email}`);

    // Optionally send confirmation email
    try {
      const confirmationMessage = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Password Changed Successfully - ConnectPay',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Password Changed</h1>
              </div>
              <div class="content">
                <p>Hello ${user.name},</p>
                <p>Your password has been successfully changed.</p>
                <p>If you did not make this change, please contact our support team immediately.</p>
                <p>Time: ${new Date().toLocaleString()}</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ConnectPay. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      await sgMail.send(confirmationMessage);
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password. Please try again.'
    });
  }
});
module.exports = router;