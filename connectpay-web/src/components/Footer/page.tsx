'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Shield, CheckCircle, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import Link from 'next/link';

// Configuration - moved outside component for performance
const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About us', href: '/about' },
];

const SERVICE_LINKS = [
  { label: 'Airtime top-up', href: '/services/airtime' },
  { label: 'Data bundles', href: '/services/data' },
  { label: 'Cable TV', href: '/services/cabletv' },
  { label: 'Electricity', href: '/services/electricity' },
  { label: 'Education', href: '/services/education' },
  { label: 'Betting', href: '/services/betting' },
];

const CONTACT_INFO = [
  {
    icon: Phone,
    title: '+234 800 123 4567',
    subtitle: '24/7 Support line',
    href: 'tel:+2348001234567'
  },
  {
    icon: Mail,
    title: 'support@connectpay.ng',
    subtitle: 'Email support',
    href: 'mailto:support@connectpay.ng'
  },
  {
    icon: MapPin,
    title: 'Lagos, Nigeria',
    subtitle: 'Headquarters',
    href: null
  },
];

const SOCIAL_LINKS = [
  { name: 'Facebook', icon: Facebook, href: '#', color: 'hover:bg-blue-600' },
  { name: 'Twitter', icon: Twitter, href: '#', color: 'hover:bg-blue-400' },
  { name: 'Instagram', icon: Instagram, href: '#', color: 'hover:bg-pink-600' },
  { name: 'LinkedIn', icon: Linkedin, href: '#', color: 'hover:bg-blue-700' },
];

const LEGAL_LINKS = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
  { label: 'Cookie policy', href: '/cookies' },
  { label: 'Refund policy', href: '/refund' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = () => {
    if (email && email.includes('@')) {
      console.log('Newsletter subscription:', email);
      setEmail('');
      alert('Thank you for subscribing!');
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-400 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                <img 
                  src="/assets/images/logo.png" 
                  alt="ConnectPay Logo" 
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-white font-bold text-lg">CP</span>';
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white uppercase">ConnectPay</span>
                <span className="text-xs text-gray-400 uppercase">Digital services</span>
              </div>
            </div>
            
            <p className="text-gray-400 mb-6 leading-relaxed max-w-md">
              Your trusted partner for all digital transactions in Nigeria. Fast, secure, and reliable services at your fingertips.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a 
                    key={social.name}
                    href={social.href}
                    aria-label={`Visit our ${social.name} page`}
                    className={`w-10 h-10 bg-gray-800 ${social.color} rounded-lg flex items-center justify-center transition-all duration-300 group`}
                  >
                    <Icon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-6 pb-2 border-b border-gray-800">
              Quick links
            </h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-gray-400 hover:text-red-400 transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-6 pb-2 border-b border-gray-800">
              Services
            </h4>
            <ul className="space-y-3">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-gray-400 hover:text-red-400 transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-6 pb-2 border-b border-gray-800">
              Contact us
            </h4>
            <ul className="space-y-4">
              {CONTACT_INFO.map((contact, idx) => {
                const Icon = contact.icon;
                const content = (
                  <>
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg group-hover:bg-red-700 transition-colors">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="block text-white group-hover:text-red-400 transition-colors">
                        {contact.title}
                      </span>
                      <span className="text-xs text-gray-500">{contact.subtitle}</span>
                    </div>
                  </>
                );

                return (
                  <li key={idx} className="flex items-start gap-3 group">
                    {contact.href ? (
                      <a href={contact.href} className="flex items-start gap-3 group w-full">
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4 lg:mb-0">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">Newsletter</h4>
                    <p className="text-gray-400 text-sm">Stay updated with deals</p>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      aria-label="Email address for newsletter"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm sm:text-base"
                    />
                  </div>
                  <button
                    onClick={handleNewsletterSubmit}
                    aria-label="Subscribe to newsletter"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-red-600/20 text-sm sm:text-base"
                  >
                    Subscribe now
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  By subscribing, you agree to our Privacy policy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">
                © {currentYear} ConnectPay. All rights reserved.
              </p>
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {LEGAL_LINKS.map((link, idx) => (
                <React.Fragment key={link.href}>
                  {idx > 0 && <span className="text-gray-600">•</span>}
                  <Link 
                    href={link.href}
                    className="text-gray-400 hover:text-red-400 transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1.5 rounded-lg">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Secure platform</span>
              </div>
              <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Verified service</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Available on:</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors">
                  iOS
                </button>
                <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors">
                  Android
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}