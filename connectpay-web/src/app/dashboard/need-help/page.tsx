'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, Mail, Phone, MapPin, FileText, 
  ChevronDown, ChevronUp, X, Paperclip,
  Check, Calendar, MessageSquare, Headphones, Send, Clock
} from 'lucide-react';

export default function HelpCenterPage() {
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const dropdownRef = useRef(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [ticketData, setTicketData] = useState({
    email: '',
    subject: '',
    category: '',
    phoneNumber: '',
    transactionId: '',
    date: new Date().toISOString().split('T')[0],
    comment: '',
  });

  const faqList = [
    {
      id: 1,
      question: 'How do I buy airtime?',
      answer: 'Navigate to the "Buy Airtime" section, select your network, enter phone number and amount, then confirm with your PIN.',
      category: 'Airtime'
    },
    {
      id: 2,
      question: 'What networks are supported?',
      answer: 'We support MTN, Airtel, Glo, and 9Mobile networks for airtime purchases.',
      category: 'Airtime'
    },
    {
      id: 3,
      question: 'How do I fund my wallet?',
      answer: 'You can fund your wallet through bank transfer, card payment, or USSD. Go to "Fund Wallet" for available options.',
      category: 'Wallet'
    },
    {
      id: 4,
      question: 'Is my transaction secure?',
      answer: 'Yes, all transactions are encrypted and protected with your 4-digit PIN. We use industry-standard security measures.',
      category: 'Security'
    },
    {
      id: 5,
      question: 'How long does airtime purchase take?',
      answer: 'Airtime purchases are usually instant. If there\'s a delay, it will be processed within 5 minutes.',
      category: 'Airtime'
    },
    {
      id: 6,
      question: 'How do I change my transaction PIN?',
      answer: 'Go to Security Settings → Transaction PIN section. You\'ll need to enter your current PIN to set a new one.',
      category: 'Security'
    },
    {
      id: 7,
      question: 'What should I do if a transaction fails?',
      answer: 'Check your transaction history. If the amount was deducted, contact support with your transaction ID for investigation.',
      category: 'Transactions'
    },
    {
      id: 8,
      question: 'Are there transaction limits?',
      answer: 'Yes, there are daily and monthly limits for security. Check your account settings for your specific limits.',
      category: 'Transactions'
    },
  ];

  const ticketCategories = [
    'Airtime', 'Data', 'Electricity', 'Cable', 'Recharge Card', 
    'WAEC PIN', 'Wallet Funding', 'Enquiries', 'Suggestions', 
    'Feedbacks', 'Login Issues', 'Website Issues', 
    'Transaction Issues', 'Account Issues', 'Security Concerns'
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCategoryModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showAlert = (title, message, type = 'error') => {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alertEl = document.createElement('div');
    alertEl.className = `custom-alert ${type}`;
    alertEl.innerHTML = `
      <div class="alert-content">
        <div class="alert-icon">${type === 'success' ? '✓' : '⚠'}</div>
        <div>
          <div class="alert-title">${title}</div>
          <div class="alert-message">${message}</div>
        </div>
      </div>
      <button onclick="this.parentElement.remove()" class="alert-close">×</button>
    `;
    
    document.body.appendChild(alertEl);
    
    // Auto remove after 8 seconds (longer for success messages)
    const timeout = type === 'success' ? 8000 : 5000;
    setTimeout(() => {
      if (alertEl && alertEl.parentElement) {
        alertEl.style.opacity = '0';
        alertEl.style.transform = 'translateX(100%)';
        setTimeout(() => alertEl.remove(), 300);
      }
    }, timeout);
  };

  const handleSubmitTicket = async (e) => {
    if (e) e.preventDefault();
    
    console.log('🎫 Submit ticket clicked');
    console.log('📋 Current form data:', ticketData);

    if (!ticketData.email.trim()) {
      showAlert('Required Field Missing', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ticketData.email)) {
      showAlert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!ticketData.subject.trim()) {
      showAlert('Required Field Missing', 'Please enter a subject for your ticket');
      return;
    }

    if (!ticketData.transactionId.trim()) {
      showAlert('Required Field Missing', 'Please enter your transaction ID');
      return;
    }

    if (!ticketData.comment.trim()) {
      showAlert('Required Field Missing', 'Please provide a detailed description of your issue');
      return;
    }

    if (!isRobotVerified) {
      showAlert('Verification Required', 'Please confirm you are not a robot');
      return;
    }

    console.log('✅ All validations passed!');
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const ticketNumber = `TKT-${Date.now()}`;
      console.log('✅ SUCCESS! Ticket number:', ticketNumber);
      
      // Create success message
      const message = `Your ticket #${ticketNumber} has been created successfully! We'll respond to ${ticketData.email} within 24 hours.`;
      
      console.log('🎉 Setting states...');
      
      // Update all states together
      setIsSubmitting(false);
      setSuccessMessage(message);
      setShowSuccess(true);
      
      console.log('✅ All states updated');
      
      // Show custom alert in top-right
      showAlert(
        'Ticket Submitted Successfully! 🎉',
        `Ticket #${ticketNumber} created. Check your email for confirmation.`,
        'success'
      );
      
    } catch (error) {
      console.error('❌ Submission error:', error);
      setIsSubmitting(false);
      showAlert('Submission Failed', 'An error occurred. Please try again later.');
    }
  };

  const resetTicketForm = () => {
    setTicketData({
      email: '',
      subject: '',
      category: '',
      phoneNumber: '',
      transactionId: '',
      date: new Date().toISOString().split('T')[0],
      comment: '',
    });
    setScreenshot(null);
    setIsRobotVerified(false);
    setShowSuccess(false);
    setSuccessMessage('');
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
    resetTicketForm();
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert('File Too Large', 'Maximum file size is 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setScreenshot(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">HELP CENTER</h1>
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Help Center</span>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="content-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-card" onClick={() => setShowTicketModal(true)}>
            <div className="action-icon primary">
              <FileText size={20} />
            </div>
            <h3 className="action-title">Submit Ticket</h3>
            <p className="action-description">Get help from our support team</p>
          </button>

          <button className="action-card" onClick={() => setShowFaqModal(true)}>
            <div className="action-icon secondary">
              <HelpCircle size={20} />
            </div>
            <h3 className="action-title">Browse FAQs</h3>
            <p className="action-description">Find quick answers</p>
          </button>

          <button className="action-card" onClick={() => window.location.href = 'mailto:Mutiuridwan0@gmail.com'}>
            <div className="action-icon tertiary">
              <Mail size={20} />
            </div>
            <h3 className="action-title">Email Support</h3>
            <p className="action-description">Send us a message</p>
          </button>
        </div>
      </div>

      {/* Popular FAQs */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Popular Questions</h2>
          <button className="view-all-link" onClick={() => setShowFaqModal(true)}>
            View All <ChevronDown size={14} />
          </button>
        </div>
        
        <div className="faq-grid">
          {faqList.slice(0, 6).map((faq) => (
            <div key={faq.id} className="faq-card">
              <button 
                className="faq-header"
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <div className="faq-question">
                  <MessageSquare size={16} className="faq-icon" />
                  <span>{faq.question}</span>
                </div>
                {expandedFaq === faq.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedFaq === faq.id && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Cards */}
      <div className="content-section contact-section">
        <h2 className="section-title">Contact Information</h2>
        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-icon phone">
              <Phone size={20} />
            </div>
            <h3 className="contact-title">Phone Support</h3>
            <p className="contact-detail">+234 814 190 0468</p>
            <div className="contact-hours">
              <Clock size={12} />
              <span>Mon - Fri: 8AM - 8PM</span>
            </div>
            <button className="contact-btn" onClick={() => window.open('tel:+2348141900468')}>
              Call Now
            </button>
          </div>

          <div className="contact-card">
            <div className="contact-icon email">
              <Mail size={20} />
            </div>
            <h3 className="contact-title">Email Support</h3>
            <p className="contact-detail">Mutiuridwan0@gmail.com</p>
            <div className="contact-hours">
              <Clock size={12} />
              <span>Reply within 24 hours</span>
            </div>
            <button className="contact-btn" onClick={() => window.location.href = 'mailto:Mutiuridwan0@gmail.com'}>
              Send Email
            </button>
          </div>

          <div className="contact-card">
            <div className="contact-icon location">
              <MapPin size={20} />
            </div>
            <h3 className="contact-title">Office Address</h3>
            <p className="contact-detail">Akala Estate, Akobo</p>
            <p className="contact-detail">Ibadan, Oyo State</p>
            <p className="contact-detail">Nigeria</p>
          </div>
        </div>
      </div>

      {/* Submit Ticket Modal */}
      {showTicketModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && !showSuccess && handleCloseModal()}>
          <div className="modal-container ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="modal-title">{showSuccess ? '✅ Success!' : 'Submit Support Ticket'}</h2>
                  <p className="modal-subtitle">{showSuccess ? 'Your ticket has been created' : "We'll respond within 24 hours"}</p>
                </div>
              </div>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {showSuccess ? (
                <div className="success-view">
                  <div className="success-checkmark">✓</div>
                  <h2 className="success-heading">Ticket Submitted Successfully!</h2>
                  <p className="success-message">{successMessage}</p>
                  <button className="success-btn" onClick={handleCloseModal}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={ticketData.email}
                    onChange={(e) => setTicketData({...ticketData, email: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description"
                    value={ticketData.subject}
                    onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label optional">Category</label>
                  <div className="custom-select-wrapper" ref={dropdownRef}>
                    <button
                      type="button"
                      className="custom-select-trigger"
                      onClick={() => setShowCategoryModal(!showCategoryModal)}
                      disabled={isSubmitting}
                    >
                      <span className={ticketData.category ? '' : 'placeholder'}>
                        {ticketData.category || 'Select category'}
                      </span>
                      <ChevronDown size={14} />
                    </button>
                    {showCategoryModal && (
                      <div className="custom-select-dropdown">
                        {ticketCategories.map((cat) => (
                          <div
                            key={cat}
                            className={`select-option ${ticketData.category === cat ? 'selected' : ''}`}
                            onClick={() => {
                              setTicketData({...ticketData, category: cat});
                              setShowCategoryModal(false);
                            }}
                          >
                            {cat}
                            {ticketData.category === cat && <Check size={14} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label optional">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+234 XXX XXX XXXX"
                    value={ticketData.phoneNumber}
                    onChange={(e) => setTicketData({...ticketData, phoneNumber: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your transaction ID"
                    value={ticketData.transactionId}
                    onChange={(e) => setTicketData({...ticketData, transactionId: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label optional">Date of Issue</label>
                  <input
                    type="date"
                    className="form-input"
                    value={ticketData.date}
                    onChange={(e) => setTicketData({...ticketData, date: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    value={ticketData.comment}
                    onChange={(e) => setTicketData({...ticketData, comment: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label optional">Attach Screenshot</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="screenshot"
                      className="file-input"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="screenshot" className="file-label">
                      <Paperclip size={16} />
                      <span>{screenshot ? 'Screenshot attached' : 'Choose file (Max 5MB)'}</span>
                    </label>
                    {screenshot && (
                      <button 
                        type="button" 
                        className="file-remove"
                        onClick={() => setScreenshot(null)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={isRobotVerified}
                      onChange={(e) => setIsRobotVerified(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span className="checkbox-label">I confirm that I am not a robot</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmitTicket}
                  disabled={!isRobotVerified || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Ticket
                    </>
                  )}
                </button>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="modal-overlay" onClick={() => setShowFaqModal(false)}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-icon">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 className="modal-title">Frequently Asked Questions</h2>
                  <p className="modal-subtitle">{faqList.length} articles found</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowFaqModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="faq-list">
                {faqList.map((faq) => (
                  <div key={faq.id} className="faq-item">
                    <button 
                      className="faq-item-header"
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    >
                      <span className="faq-number">{String(faq.id).padStart(2, '0')}</span>
                      <span className="faq-item-question">{faq.question}</span>
                      {expandedFaq === faq.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="faq-item-answer">
                        <p>{faq.answer}</p>
                        <span className="faq-category">{faq.category}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background: #f9fafb;
          padding: 16px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
          margin: 0 0 8px 0;
          letter-spacing: 0.3px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .breadcrumb-link {
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
        }

        .breadcrumb-link:hover {
          color: #dc2626;
        }

        .breadcrumb-separator {
          color: #9ca3af;
          font-weight: 400;
        }

        .breadcrumb-current {
          color: #1f2937;
          font-weight: 500;
        }

        .content-section {
          margin-bottom: 24px;
        }

        .contact-section {
          margin-bottom: 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .view-all-link {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          padding: 4px 0;
        }

        .view-all-link:hover {
          gap: 6px;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }

        .action-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
          border-color: #dc2626;
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: white;
        }

        .action-icon.primary {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }

        .action-icon.secondary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .action-icon.tertiary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .action-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .action-description {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }

        .faq-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .faq-card:hover {
          border-color: #dc2626;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .faq-header {
          width: 100%;
          padding: 12px;
          background: none;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: left;
          gap: 8px;
        }

        .faq-question {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }

        .faq-icon {
          color: #dc2626;
          flex-shrink: 0;
        }

        .faq-answer {
          padding: 0 12px 12px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .contact-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .contact-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .contact-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: white;
        }

        .contact-icon.phone {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .contact-icon.email {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .contact-icon.location {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .contact-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .contact-detail {
          font-size: 13px;
          color: #4b5563;
          margin: 2px 0;
          line-height: 1.4;
        }

        .contact-hours {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 12px;
          color: #6b7280;
          margin: 8px 0 12px;
        }

        .contact-btn {
          width: 100%;
          padding: 8px 12px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: auto;
        }

        .contact-btn:hover {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 12px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.2s ease-out;
        }

        .modal-container.ticket-modal {
          max-width: 500px;
        }

        .modal-container.large {
          max-width: 700px;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .modal-header-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .modal-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .modal-subtitle {
          font-size: 13px;
          opacity: 0.9;
          margin: 0;
        }

        .modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: white;
          flex-shrink: 0;
        }

        .modal-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }

        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-label:after {
          content: ' *';
          color: #dc2626;
        }

        .form-label.optional:after {
          content: '';
          color: #6b7280;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 12px 14px;
          font-size: 15px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          transition: all 0.2s;
          font-family: inherit;
          min-height: 44px;
          background-color: white;
          color: #1f2937;
          font-weight: 500;
        }

        .form-input:hover:not(:disabled),
        .form-textarea:hover:not(:disabled) {
          border-color: #9ca3af;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
          background-color: #fff;
        }

        .form-input:disabled,
        .form-textarea:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
          line-height: 1.5;
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .custom-select-wrapper {
          position: relative;
        }

        .custom-select-trigger {
          width: 100%;
          padding: 12px 14px;
          font-size: 15px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
          min-height: 44px;
          color: #1f2937;
          font-weight: 500;
        }

        .custom-select-trigger:hover:not(:disabled) {
          border-color: #9ca3af;
        }

        .custom-select-trigger:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .custom-select-trigger:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .custom-select-trigger .placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .custom-select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
          animation: dropdownSlide 0.2s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .select-option {
          padding: 12px 14px;
          font-size: 14px;
          color: #1f2937;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
        }

        .select-option:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .select-option.selected {
          background: #dc2626;
          color: white;
          font-weight: 600;
        }

        .file-upload {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .file-input {
          display: none;
        }

        .file-label {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 14px;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
          font-size: 13px;
          color: #6b7280;
          min-height: 44px;
        }

        .file-label:hover {
          border-color: #dc2626;
          background: #fef2f2;
          color: #dc2626;
        }

        .file-remove {
          padding: 8px 12px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .file-remove:hover {
          background: #fee2e2;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid #e5e7eb;
        }

        .checkbox-container input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #dc2626;
        }

        .checkbox-label {
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          font-weight: 500;
        }

        .checkbox-label:after {
          content: ' *';
          color: #dc2626;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 44px;
        }

        .btn-primary {
          background: #dc2626;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
        }

        .btn-primary:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: white;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
          color: #1f2937;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .faq-item {
          background: white;
        }

        .faq-item-header {
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .faq-item-header:hover {
          background: #f9fafb;
        }

        .faq-number {
          font-size: 13px;
          font-weight: 700;
          color: #dc2626;
          min-width: 28px;
        }

        .faq-item-question {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .faq-item-answer {
          padding: 0 16px 16px 56px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
          animation: slideDown 0.2s ease-out;
        }

        .faq-category {
          display: inline-block;
          margin-top: 8px;
          padding: 3px 10px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .custom-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          z-index: 99999;
          min-width: 320px;
          max-width: 400px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border-left: 4px solid;
          animation: slideIn 0.3s ease-out;
          transition: all 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .custom-alert.success {
          border-left-color: #10b981;
        }

        .custom-alert.error {
          border-left-color: #ef4444;
        }

        .alert-content {
          flex: 1;
          display: flex;
          gap: 10px;
        }

        .alert-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .custom-alert.success .alert-icon {
          background: #d1fae5;
          color: #10b981;
        }

        .custom-alert.error .alert-icon {
          background: #fee2e2;
          color: #ef4444;
        }

        .alert-title {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
          display: block;
        }

        .alert-message {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.4;
          display: block;
        }

        .alert-close {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          flex-shrink: 0;
        }

        .alert-close:hover {
          color: #1f2937;
        }

        .success-banner {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          animation: slideDown 0.3s ease-out;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .success-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .success-content {
          flex: 1;
        }

        .success-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .success-text {
          font-size: 14px;
          margin: 0;
          opacity: 0.95;
          line-height: 1.4;
        }

        .success-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          min-height: 300px;
        }

        .success-checkmark {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: white;
          margin-bottom: 24px;
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .success-heading {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 12px 0;
        }

        .success-message {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 32px 0;
          max-width: 400px;
        }

        .success-btn {
          padding: 12px 32px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .success-btn:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px 16px;
          }

          .actions-grid,
          .faq-grid,
          .contact-grid {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: span 1;
          }

          .modal-container {
            max-height: 90vh;
          }
        }
      `}</style>
    </div>
  );
}