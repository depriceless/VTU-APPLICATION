// npm install nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

transporter.verify((err) => {
  if (err) {
    console.warn('Email transporter not ready — check EMAIL_USER / EMAIL_PASS in .env:', err.message);
  } else {
    console.log('Gmail email service ready');
  }
});

const APP_NAME = 'ConnectPay';

// ── Core send utility ──────────────────────────────────────────
const sendEmail = async (to, subject, htmlContent, textContent) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`Email skipped (not configured): ${subject} to ${to}`);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    await transporter.sendMail({
      from:    `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html:    htmlContent,
      text:    textContent || htmlContent.replace(/<[^>]*>/g, ''),
    });
    console.log(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error(`Email failed to ${to}:`, error.message);
    return { success: false, message: error.message };
  }
};

// ── Password Reset Email ───────────────────────────────────────
const sendPasswordResetEmail = async (to, name, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff3b30; color: white; padding: 24px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h2 { margin: 0; font-size: 22px; }
        .content { background: #f9f9f9; padding: 30px 24px; border-radius: 0 0 8px 8px; }
        .btn { display: inline-block; background: #ff3b30; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
        .warning { background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 4px; font-size: 13px; margin-top: 24px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        .divider { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔐 Password Reset Request</h2>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a request to reset the password for your ${APP_NAME} account. Click the button below to set a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset My Password</a>
          </div>
          <hr class="divider" />
          <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 13px; word-break: break-all; color: #ff3b30;">${resetUrl}</p>
          <div class="warning">
            ⚠️ This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not be changed.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${name},\n\nReset your ${APP_NAME} password here: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\n© ${new Date().getFullYear()} ${APP_NAME}`;

  return sendEmail(to, `Reset Your ${APP_NAME} Password`, html, text);
};

// ── Support ticket emails ──────────────────────────────────────
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
        <div class="header"><h2>Support Ticket Received</h2></div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for contacting our support team. We have received your support ticket and will respond as soon as possible.</p>
          <div class="ticket-id"><strong>Ticket ID:</strong> ${ticket.ticketId}</div>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Category:</strong> ${ticket.category}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
          <hr>
          <p><strong>Your Message:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 5px;">${ticket.comment}</p>
          <p>We typically respond within 24 hours. Reference Ticket ID: <strong>${ticket.ticketId}</strong></p>
        </div>
        <div class="footer"><p>This is an automated message. Please do not reply to this email.</p></div>
      </div>
    </body>
    </html>
  `;
  const text = `Support Ticket Received\n\nTicket ID: ${ticket.ticketId}\nSubject: ${ticket.subject}\nCategory: ${ticket.category}\nPriority: ${ticket.priority}\nSubmitted: ${new Date(ticket.createdAt).toLocaleString()}\n\nYour Message:\n${ticket.comment}`;
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
        <div class="header"><h2>Support Team Response</h2></div>
        <div class="content">
          <p>Hello,</p>
          <p>Our support team has responded to your ticket:</p>
          <div class="ticket-id"><strong>Ticket ID:</strong> ${ticket.ticketId}</div>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p><strong>Response Date:</strong> ${new Date().toLocaleString()}</p>
          <div class="response"><p><strong>Support Team Response:</strong></p><p>${response}</p></div>
        </div>
        <div class="footer"><p>This is an automated message. Please do not reply to this email.</p></div>
      </div>
    </body>
    </html>
  `;
  const text = `Support Team Response\n\nTicket ID: ${ticket.ticketId}\nSubject: ${ticket.subject}\nStatus: ${ticket.status}\n\nResponse:\n${response}`;
  return { html, text };
};

const sendUserConfirmationEmail = async (ticket) => {
  try {
    const emailContent = createTicketConfirmationEmail(ticket);
    return await sendEmail(ticket.email, `Support Ticket Received - ${ticket.ticketId}`, emailContent.html, emailContent.text);
  } catch (error) {
    console.error('Error in sendUserConfirmationEmail:', error.message);
    return { success: false, message: error.message };
  }
};

const sendUserResponseNotification = async (ticket, response) => {
  try {
    const emailContent = createAdminResponseEmail(ticket, response);
    return await sendEmail(ticket.email, `Support Update - ${ticket.ticketId}`, emailContent.html, emailContent.text);
  } catch (error) {
    console.error('Error in sendUserResponseNotification:', error.message);
    return { success: false, message: error.message };
  }
};

const sendAdminNotificationEmail = async (ticket) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: false, message: 'Admin email not configured' };

  try {
    const html = `
      <h2>New Support Ticket Submitted</h2>
      <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
      <p><strong>From:</strong> ${ticket.email}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Category:</strong> ${ticket.category}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${ticket.comment}</div>
      <p><a href="${process.env.FRONTEND_URL}/admin/support/tickets/${ticket.ticketId}">View Ticket</a></p>
    `;
    return await sendEmail(adminEmail, `New Support Ticket: ${ticket.subject}`, html);
  } catch (error) {
    console.error('Error in sendAdminNotificationEmail:', error.message);
    return { success: false, message: error.message };
  }
};

const sendPasswordChangedEmail = async (to, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 24px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h2 { margin: 0; font-size: 22px; }
        .content { background: #f9f9f9; padding: 30px 24px; border-radius: 0 0 8px 8px; }
        .warning { background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 4px; font-size: 13px; margin-top: 24px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Password Changed Successfully</h2>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your ConnectPay account password has been changed successfully.</p>
          <div class="warning">
            ⚠️ If you did not make this change, please contact our support team immediately or reset your password right away.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ConnectPay. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${name},\n\nYour ConnectPay password has been changed successfully.\n\nIf you did not make this change, contact support immediately.\n\n© ${new Date().getFullYear()} ConnectPay`;

  return sendEmail(to, 'Your Password Has Been Changed', html, text);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
   sendPasswordChangedEmail,   
  sendUserConfirmationEmail,
  sendUserResponseNotification,
  sendAdminNotificationEmail,
};