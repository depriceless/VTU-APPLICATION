// Install required packages first:
// npm install nodemailer

const nodemailer = require('nodemailer');

// Email configuration - Add these to your .env file
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail', // or 'outlook', 'yahoo', etc.
  user: process.env.EMAIL_USER, // your email address
  pass: process.env.EMAIL_PASS, // your email password or app password
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER
};

// Create email transporter
const createEmailTransporter = () => {
  if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
    console.warn('Email credentials not configured. Email notifications disabled.');
    return null;
  }

  try {
    return nodemailer.createTransporter({
      service: EMAIL_CONFIG.service,
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass
      }
    });
  } catch (error) {
    console.error('Error creating email transporter:', error.message);
    return null;
  }
};

const emailTransporter = createEmailTransporter();

// Send email utility function
const sendEmail = async (to, subject, htmlContent, textContent) => {
  if (!emailTransporter) {
    console.log(`Email not sent (no transporter): ${subject} to ${to}`);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `"Support Team" <${EMAIL_CONFIG.from}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}: ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Email sending failed to ${to}:`, error.message);
    return { success: false, message: error.message };
  }
};

// Email templates
const createTicketConfirmationEmail = (ticket) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff3b30; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .ticket-id { background: #e3f2fd; padding: 10px; border-left: 4px solid #2196f3; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Support Ticket Received</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for contacting our support team. We have received your support ticket and will respond as soon as possible.</p>
          
          <div class="ticket-id">
            <strong>Ticket ID:</strong> ${ticket.ticketId}
          </div>
          
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Category:</strong> ${ticket.category}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
          
          <hr>
          <p><strong>Your Message:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 5px;">${ticket.comment}</p>
          
          <p>We typically respond within 24 hours. You can reference this ticket using the Ticket ID: <strong>${ticket.ticketId}</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Support Ticket Received
    
    Thank you for contacting our support team. We have received your support ticket and will respond as soon as possible.
    
    Ticket ID: ${ticket.ticketId}
    Subject: ${ticket.subject}
    Category: ${ticket.category}
    Priority: ${ticket.priority}
    Submitted: ${new Date(ticket.createdAt).toLocaleString()}
    
    Your Message:
    ${ticket.comment}
    
    We typically respond within 24 hours. You can reference this ticket using the Ticket ID: ${ticket.ticketId}
  `;

  return { html, text };
};

const createAdminResponseEmail = (ticket, response) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .ticket-id { background: #e3f2fd; padding: 10px; border-left: 4px solid #2196f3; margin: 15px 0; }
        .response { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Support Team Response</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Our support team has responded to your ticket. Please find the details below:</p>
          
          <div class="ticket-id">
            <strong>Ticket ID:</strong> ${ticket.ticketId}
          </div>
          
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p><strong>Response Date:</strong> ${new Date().toLocaleString()}</p>
          
          <div class="response">
            <p><strong>Support Team Response:</strong></p>
            <p>${response}</p>
          </div>
          
          <p>If you have any further questions, please reply to this ticket or create a new support request.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Support Team Response
    
    Our support team has responded to your ticket. Please find the details below:
    
    Ticket ID: ${ticket.ticketId}
    Subject: ${ticket.subject}
    Status: ${ticket.status}
    Response Date: ${new Date().toLocaleString()}
    
    Support Team Response:
    ${response}
    
    If you have any further questions, please reply to this ticket or create a new support request.
  `;

  return { html, text };
};

// Updated email functions for your support route
const sendUserConfirmationEmail = async (ticket) => {
  try {
    const emailContent = createTicketConfirmationEmail(ticket);
    const result = await sendEmail(
      ticket.email,
      `Support Ticket Received - ${ticket.ticketId}`,
      emailContent.html,
      emailContent.text
    );
    
    if (result.success) {
      console.log(`Confirmation email sent to ${ticket.email} for ticket ${ticket.ticketId}`);
    } else {
      console.error(`Failed to send confirmation email to ${ticket.email}:`, result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendUserConfirmationEmail:', error.message);
    return { success: false, message: error.message };
  }
};

const sendUserResponseNotification = async (ticket, response) => {
  try {
    const emailContent = createAdminResponseEmail(ticket, response);
    const result = await sendEmail(
      ticket.email,
      `Support Update - ${ticket.ticketId}`,
      emailContent.html,
      emailContent.text
    );
    
    if (result.success) {
      console.log(`Response notification sent to ${ticket.email} for ticket ${ticket.ticketId}`);
    } else {
      console.error(`Failed to send response notification to ${ticket.email}:`, result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendUserResponseNotification:', error.message);
    return { success: false, message: error.message };
  }
};

// Admin notification email (optional - for notifying admin team about new tickets)
const sendAdminNotificationEmail = async (ticket) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('Admin email not configured, skipping admin notification');
    return { success: false, message: 'Admin email not configured' };
  }

  try {
    const html = `
      <h2>New Support Ticket Submitted</h2>
      <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
      <p><strong>From:</strong> ${ticket.email}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Category:</strong> ${ticket.category}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${ticket.comment}
      </div>
      <p><a href="http://localhost:3000/admin/support/tickets/${ticket.ticketId}">View Ticket</a></p>
    `;

    const result = await sendEmail(
      adminEmail,
      `New Support Ticket: ${ticket.subject}`,
      html
    );
    
    return result;
  } catch (error) {
    console.error('Error in sendAdminNotificationEmail:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendEmail,
  sendUserConfirmationEmail,
  sendUserResponseNotification,
  sendAdminNotificationEmail
};