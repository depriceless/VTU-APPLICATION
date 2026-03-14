'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';

interface ContactInfoCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string;
  subContent: string;
}

export default function ContactPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 sm:pt-24 lg:pt-32 pb-12 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4 mt-10 sm:mt-0">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              Get In Touch
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 px-4">
              Contact Us
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Have questions? We're here to help. Reach out to our team and we'll get back to you within 24 hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <ContactInfoCard
                icon={Phone}
                title="Phone"
                content="+234 8141900468"
                subContent="Mon-Fri 9am to 6pm"
              />
              <ContactInfoCard
                icon={Mail}
                title="Email"
                content="Datakonnectdirect@gmail.com"
                subContent="We'll respond within 24 hours"
              />
              <ContactInfoCard
                icon={MapPin}
                title="Office"
                content="Lagos, Nigeria"
                subContent="Victoria Island"
              />
              <ContactInfoCard
                icon={Clock}
                title="Business Hours"
                content="Monday - Friday"
                subContent="9:00 AM - 6:00 PM WAT"
              />
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 p-5 sm:p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-lg flex items-center justify-center">
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Send us a Message</h2>
                </div>
                <ContactForm />
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 lg:mt-16 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-red-100">
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Need Immediate Assistance?</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Our customer support team is available 24/7 via live chat on our platform. Get instant answers to your questions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base"
                >
                  Open Live Chat
                </a>
                <a
                  href="/faq"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 transition text-sm sm:text-base"
                >
                  View FAQs
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function ContactInfoCard({ icon: Icon, title, content, subContent }: ContactInfoCardProps) {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-red-200 transition-all duration-300 group">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 transition-colors duration-300">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 group-hover:text-white transition-colors duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{title}</h3>
          <p className="text-gray-700 font-medium text-sm sm:text-base break-words">{content}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{subContent}</p>
        </div>
      </div>
    </div>
  );
}

function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    setTimeout(() => {
      setSubmitMessage('Thank you for contacting us! We will respond within 24 hours.');
      setIsSubmitting(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });

      setTimeout(() => {
        setSubmitMessage('');
      }, 5000);
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div>
          <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
            First Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition placeholder:text-gray-400"
            placeholder="John"
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
            Last Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition placeholder:text-gray-400"
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
          Email Address <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition placeholder:text-gray-400"
          placeholder="john.doe@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition placeholder:text-gray-400"
          placeholder="+234 800 000 0000"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
          Subject <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition placeholder:text-gray-400"
          placeholder="How can we help?"
          required
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
          Message <span className="text-red-600">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition resize-none placeholder:text-gray-400"
          placeholder="Tell us more about your inquiry..."
          required
        ></textarea>
      </div>

      {submitMessage && (
        <div className="p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <p className="text-green-800 text-xs sm:text-sm font-medium">{submitMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 sm:py-3.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            Send Message
          </>
        )}
      </button>

      <p className="text-xs sm:text-sm text-gray-500 text-center mt-3">
        By submitting this form, you agree to our privacy policy and terms of service.
      </p>
    </form>
  );
}