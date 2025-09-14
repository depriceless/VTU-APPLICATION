const jwt = require('jsonwebtoken');

const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }

    // Verify token (without checking database)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Just use the decoded token data
    req.admin = decoded;
    next();
    
  } catch (error) {
    console.error('Admin auth error:', error.message);
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid' 
    });
  }
};

module.exports = adminAuth;