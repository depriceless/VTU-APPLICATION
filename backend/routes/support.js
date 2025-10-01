const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const notificationManager = require('./notificationManager');

// File to store tickets persistently
const TICKETS_FILE = path.join(__dirname, '../tickets.json');

// Load existing tickets or start with empty array
let tickets = [];
let ticketCounter = 1;

// Load tickets from file on startup
try {
  if (fs.existsSync(TICKETS_FILE)) {
    const data = fs.readFileSync(TICKETS_FILE, 'utf8');
    tickets = JSON.parse(data);
    console.log(`Loaded ${tickets.length} existing tickets from storage`);
    
    // Set counter to avoid duplicate IDs
    if (tickets.length > 0) {
      const maxId = Math.max(...tickets.map(t => t.id || 0));
      ticketCounter = maxId + 1;
    }
  } else {
    console.log('No existing tickets file found, starting fresh');
  }
} catch (error) {
  console.log('Error loading tickets, starting fresh:', error.message);
  tickets = [];
}

// Function to save tickets to file
function saveTickets() {
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
    console.log(`Saved ${tickets.length} tickets to storage`);
  } catch (error) {
    console.error('Error saving tickets:', error);
  }
}

// Function to create admin notification when ticket is submitted
const createSupportTicketNotification = (ticket) => {
  try {
    const notificationData = {
      title: `New Support Ticket: ${ticket.subject}`,
      message: `New support ticket submitted by ${ticket.email}. Category: ${ticket.category}. Priority: ${ticket.priority || 'normal'}`,
      type: 'support',
      priority: ticket.priority || 'medium',
      actionRequired: true,
      actionLabel: 'View Ticket',
      actionUrl: `/admin/support/tickets/${ticket.ticketId}`,
      metadata: {
        ticketId: ticket.ticketId,
        userEmail: ticket.email,
        category: ticket.category,
        source: 'support_system'
      }
    };

    console.log('Creating admin notification for support ticket:', notificationData.title);
    const notification = notificationManager.createNotification(notificationData);
    console.log('Admin notification created successfully:', notification._id);
    return notification;
    
  } catch (error) {
    console.error('Error creating support ticket notification:', error);
    return null;
  }
};

// @desc    Create new support ticket
// @route   POST /api/support/tickets
// @access  Public
router.post('/tickets', async (req, res) => {
  try {
    console.log('Received support ticket request:', req.body);
    
    const {
      email,
      subject,
      category,
      phoneNumber,
      transactionId,
      date,
      comment,
      screenshot
    } = req.body;

    // Validate required fields
    if (!email || !subject || !comment) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, subject, comment'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Generate ticket ID
    const ticketId = generateTicketId();

    // Determine priority based on category or keywords
    const priority = determinePriority(subject, comment, category);

    // Create ticket object
    const ticket = {
      id: ticketCounter++,
      ticketId,
      email,
      subject,
      category: category || 'General',
      phoneNumber: phoneNumber || '',
      transactionId: transactionId || '',
      date: date || new Date().toISOString(),
      comment,
      screenshot: screenshot || null,
      status: 'open',
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };

    // Store ticket in memory and save to file
    tickets.push(ticket);
    saveTickets();

    console.log(`Support ticket created successfully:`);
    console.log(`   Ticket ID: ${ticketId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Priority: ${priority}`);
    console.log(`   Total tickets: ${tickets.length}`);

    // Create admin notification for the new ticket
    const notification = await createSupportTicketNotification(ticket);

    // Send email confirmation to user (optional)
    try {
      await sendUserConfirmationEmail(ticket);
    } catch (emailError) {
      console.log('User confirmation email failed (continuing anyway):', emailError.message);
    }

    // Send notification to admin team (optional)
    try {
      await sendAdminNotificationEmail(ticket);
    } catch (emailError) {
      console.log('Admin notification email failed (continuing anyway):', emailError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      },
      message: 'Support ticket created successfully',
      notification: notification ? 'Admin notification created' : 'Admin notification failed'
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating support ticket',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Function to determine ticket priority
function determinePriority(subject, comment, category) {
  const highPriorityKeywords = [
    'urgent', 'emergency', 'critical', 'broken', 'not working', 
    'can\'t login', 'payment failed', 'money', 'transaction failed',
    'account locked', 'security', 'fraud'
  ];
  
  const mediumPriorityKeywords = [
    'issue', 'problem', 'error', 'bug', 'slow', 'help needed'
  ];

  const urgentCategories = ['Login Issues', 'Wallet Funding', 'Website Issues'];
  const mediumCategories = ['Airtime', 'Data', 'Electricity'];

  const fullText = `${subject} ${comment}`.toLowerCase();
  
  // Check for urgent categories
  if (urgentCategories.includes(category)) {
    return 'high';
  }
  
  // Check for high priority keywords
  if (highPriorityKeywords.some(keyword => fullText.includes(keyword))) {
    return 'high';
  }
  
  // Check for medium priority
  if (mediumCategories.includes(category) || 
      mediumPriorityKeywords.some(keyword => fullText.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

// Generate unique ticket ID
function generateTicketId() {
  const timestamp = Date.now();
  const counter = String(ticketCounter).padStart(4, '0');
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `TKT-${timestamp}-${counter}-${random}`;
}

// Email notification functions (implement based on your email service)
async function sendUserConfirmationEmail(ticket) {
  console.log(`User confirmation email for ticket: ${ticket.ticketId}`);
  console.log(`   To: ${ticket.email}`);
  console.log(`   Subject: Support Ticket Received - ${ticket.ticketId}`);
}

async function sendAdminNotificationEmail(ticket) {
  console.log(`Admin notification email for ticket: ${ticket.ticketId}`);
  console.log(`   Priority: ${ticket.priority}`);
  console.log(`   Category: ${ticket.category}`);
}

// @desc    Get all tickets
// @route   GET /api/support/tickets
// @access  Admin
router.get('/tickets', async (req, res) => {
  try {
    const { email, status, page = 1, limit = 10, priority } = req.query;
    
    let filteredTickets = [...tickets];
    
    // Filter by email if provided
    if (email) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.email.toLowerCase() === email.toLowerCase()
      );
    }
    
    // Filter by status if provided
    if (status) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.status === status
      );
    }

    // Filter by priority if provided
    if (priority) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.priority === priority
      );
    }

    // Sort by creation date (newest first)
    filteredTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

    console.log(`Returning ${paginatedTickets.length} tickets (${filteredTickets.length} total after filtering)`);

    res.json({
      success: true,
      data: paginatedTickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredTickets.length / parseInt(limit)),
        totalTickets: filteredTickets.length,
        hasNext: endIndex < filteredTickets.length,
        hasPrev: startIndex > 0
      }
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tickets',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Get specific ticket by ID
// @route   GET /api/support/tickets/:ticketId
// @access  Admin
router.get('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = tickets.find(t => t.ticketId === ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching ticket',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Update ticket status (specific endpoint for frontend)
// @route   PUT /api/support/tickets/:id/status
// @access  Admin
router.put('/tickets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;
    
    console.log(`Updating ticket ${id} status to:`, status);
    
    const ticketIndex = tickets.findIndex(t => t.ticketId === id || t.id == id);
    
    if (ticketIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Update ticket
    const ticket = tickets[ticketIndex];
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
    ticket.updatedAt = new Date().toISOString();

    // Save to file
    saveTickets();

    console.log(`Ticket ${ticket.ticketId} status updated to: ${status}`);

    // Create notification about status change
    try {
      await fetch('http://192.168.126.7:5000/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Ticket Status Updated: ${ticket.subject}`,
          message: `Ticket ${ticket.ticketId} status changed to ${status}. Customer: ${ticket.email}`,
          type: 'support',
          priority: 'medium',
          actionRequired: false,
          metadata: {
            ticketId: ticket.ticketId,
            userEmail: ticket.email,
            newStatus: status,
            action: 'status_update'
          }
        })
      });
    } catch (notificationError) {
      console.log('Failed to create status update notification:', notificationError.message);
    }

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket status updated successfully'
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating ticket status',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Add response to ticket (specific endpoint for frontend)
// @route   POST /api/support/tickets/:id/responses
// @access  Admin
router.post('/tickets/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isCustomerVisible = true, adminName = 'Support Team' } = req.body;
    
    console.log(`Adding response to ticket ${id}:`, message?.substring(0, 50) + '...');
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const ticketIndex = tickets.findIndex(t => t.ticketId === id || t.id == id);
    
    if (ticketIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const ticket = tickets[ticketIndex];
    
    // Ensure responses array exists
    if (!ticket.responses) {
      ticket.responses = [];
    }

    const response = {
      id: ticket.responses.length + 1,
      message: message.trim(),
      author: adminName,
      isCustomerVisible,
      type: 'admin_response',
      createdAt: new Date().toISOString()
    };

    ticket.responses.push(response);
    ticket.updatedAt = new Date().toISOString();

    // If ticket was open, mark as in-progress
    if (ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    // Save to file
    saveTickets();

    console.log(`Response added to ticket ${ticket.ticketId}`);

    // Create notification about admin response
    try {
      await fetch('http://192.168.126.7:5000/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `New Response: ${ticket.subject}`,
          message: `Admin responded to ticket ${ticket.ticketId}. Customer: ${ticket.email}`,
          type: 'support',
          priority: 'medium',
          actionRequired: false,
          metadata: {
            ticketId: ticket.ticketId,
            userEmail: ticket.email,
            responseAuthor: adminName,
            action: 'admin_response'
          }
        })
      });
    } catch (notificationError) {
      console.log('Failed to create response notification:', notificationError.message);
    }

    res.json({
      success: true,
      data: {
        response,
        ticket
      },
      message: 'Response added successfully'
    });

  } catch (error) {
    console.error('Error adding response to ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding response',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Update ticket (for admin responses) - Legacy endpoint
// @route   PATCH /api/support/tickets/:ticketId
// @access  Admin
router.patch('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, response, priority } = req.body;
    
    const ticketIndex = tickets.findIndex(t => t.ticketId === ticketId);
    
    if (ticketIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Update ticket fields
    const ticket = tickets[ticketIndex];
    
    if (status && ['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      ticket.status = status;
    }
    
    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      ticket.priority = priority;
    }
    
    if (response) {
      if (!ticket.responses) {
        ticket.responses = [];
      }
      ticket.responses.push({
        id: ticket.responses.length + 1,
        message: response,
        type: 'admin_response',
        createdAt: new Date().toISOString(),
        author: 'Support Team'
      });

      // Create notification about admin response
      try {
        await fetch('http://192.168.126.7:5000/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `Support Ticket Update: ${ticket.subject}`,
            message: `Admin has responded to ticket ${ticket.ticketId}. Customer: ${ticket.email}`,
            type: 'support',
            priority: 'medium',
            actionRequired: false,
            metadata: {
              ticketId: ticket.ticketId,
              userEmail: ticket.email,
              action: 'admin_response'
            }
          })
        });
      } catch (notificationError) {
        console.log('Failed to create response notification:', notificationError.message);
      }

      // Notify user about admin response
      try {
        await sendUserResponseNotification(ticket, response);
      } catch (emailError) {
        console.log('User response notification failed:', emailError.message);
      }
    }
    
    ticket.updatedAt = new Date().toISOString();
    
    // Save to file
    saveTickets();

    console.log(`Ticket updated: ${ticketId} - Status: ${ticket.status}`);

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully'
    });

  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating ticket',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Send response notification to user
async function sendUserResponseNotification(ticket, response) {
  console.log(`User response notification for ticket: ${ticket.ticketId}`);
}

// @desc    Get ticket statistics
// @route   GET /api/support/stats
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      highPriority: tickets.filter(t => t.priority === 'high').length,
      mediumPriority: tickets.filter(t => t.priority === 'medium').length,
      lowPriority: tickets.filter(t => t.priority === 'low').length,
      categories: {},
      recentTickets: tickets.slice(-5).reverse()
    };

    // Count by category
    tickets.forEach(ticket => {
      stats.categories[ticket.category] = (stats.categories[ticket.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Debug endpoints for development
if (process.env.NODE_ENV !== 'production') {
  // Get all tickets (debug)
  router.get('/debug/all', (req, res) => {
    res.json({
      success: true,
      data: tickets,
      count: tickets.length,
      message: 'All tickets (debug endpoint)'
    });
  });

  // Clear all tickets (debug)
  router.delete('/debug/clear', (req, res) => {
    const count = tickets.length;
    tickets = [];
    ticketCounter = 1;
    saveTickets(); // Save the cleared state
    res.json({
      success: true,
      message: `Cleared ${count} tickets`,
      data: { cleared: count }
    });
  });

  // Create test ticket (debug)
  router.post('/debug/create-test', (req, res) => {
    const testTicket = {
      id: ticketCounter++,
      ticketId: generateTicketId(),
      email: 'test@example.com',
      subject: 'Test Support Ticket',
      category: 'Login Issues',
      phoneNumber: '+234 123 456 7890',
      transactionId: 'TXN123456789',
      date: new Date().toISOString(),
      comment: 'This is a test support ticket created for debugging purposes.',
      screenshot: null,
      status: 'open',
      priority: 'medium',
      assignedTo: null,
      responses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tickets.push(testTicket);
    saveTickets();
    
    res.json({
      success: true,
      data: testTicket,
      message: 'Test support ticket created'
    });
  });
}

module.exports = router;