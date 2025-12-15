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

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
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
// @desc    Request password reset - Simple with button and link only
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

    // Deep link for mobile app
    const resetUrl = `connectpay://reset-password?token=${resetToken}`;

    // Simple, clean email with button and link only
    const message = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Reset Your ConnectPay Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              background-color: #f5f5f5;
            }
            .email-container { 
              max-width: 600px; 
              margin: 20px auto; 
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background-color: #ff3b30; 
              color: white; 
              padding: 30px 20px; 
              text-align: center; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px; 
            }
            .content p { 
              margin: 0 0 15px 0; 
              font-size: 16px;
            }
            .button-container { 
              text-align: center; 
              margin: 30px 0; 
            }
            .reset-button { 
              display: inline-block; 
              background-color: #ff3b30; 
              color: #ffffff !important; 
              padding: 15px 40px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: 600;
              font-size: 16px;
            }
            .reset-button:hover {
              background-color: #e6352a;
            }
            .link-section {
              margin: 25px 0;
              padding: 15px;
              background-color: #f0f8ff;
              border-radius: 6px;
            }
            .link-section p {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #666;
            }
            .reset-link {
              color: #007AFF;
              word-break: break-all;
              text-decoration: none;
            }
            .reset-link:hover {
              text-decoration: underline;
            }
            .warning-box {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .warning-box p {
              margin: 5px 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background-color: #f9f9f9;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header -->
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            
            <!-- Main Content -->
            <div class="content">
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>We received a request to reset your ConnectPay password. Click the button below to reset your password:</p>
              
              <!-- Reset Button -->
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>
              
              <!-- Direct Link -->
              <div class="link-section">
                <p><strong>Button not working?</strong> Copy and paste this link in your browser:</p>
                <a href="${resetUrl}" class="reset-link">${resetUrl}</a>
              </div>
              
              <!-- Warning Box -->
              <div class="warning-box">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>• This link expires in <strong>30 minutes</strong></p>
                <p>• If you didn't request this, please ignore this email</p>
                <p>• Your password will remain unchanged until you follow the link above</p>
              </div>
              
              <p style="margin-top: 30px;">Need help? Contact our support team.</p>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>© ${new Date().getFullYear()} ConnectPay. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Plain text fallback
      text: `
Password Reset Request

Hello ${user.name},

We received a request to reset your ConnectPay password.

Click or copy this link to reset your password:
${resetUrl}

⚠️ IMPORTANT:
• This link expires in 30 minutes
• If you didn't request this, please ignore this email
• Your password will remain unchanged until you follow the link above

Need help? Contact our support team.

© ${new Date().getFullYear()} ConnectPay. All rights reserved.
      `
    };

    // Send email
    await sgMail.send(message);

    console.log(`✅ Password reset email sent to: ${user.email}`);
    console.log(`🔗 Reset link: ${resetUrl}`);

    res.status(200).json({
      success: true,
      message: 'Password reset instructions have been sent to your email. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    
    // Handle SendGrid errors
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    
    res.status(500).json({
      success: false,
      message: 'Unable to send reset email. Please try again later.'
    });
  }
});
// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    console.log('🔄 Processing password reset request');
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    
    console.log('🔍 Looking for user with token...');

    // Find user with valid, non-expired token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new reset link.'
      });
    }

    console.log(`✅ Valid token found for: ${user.email}`);

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password successfully reset for: ${user.email}`);

    // Optional: Send confirmation email
    try {
      const confirmationEmail = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Your ConnectPay Password Was Changed',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
              .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Password Changed Successfully</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>This is to confirm that your ConnectPay password was successfully changed.</p>
                <p>If you did not make this change, please contact our support team immediately.</p>
                <p>You can now login with your new password.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ConnectPay. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      await sgMail.send(confirmationEmail);
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email:', emailError);
      // Don't fail the request if confirmation email fails
    }

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password. Please try again.'
    });
  }
});

module.exports = router;