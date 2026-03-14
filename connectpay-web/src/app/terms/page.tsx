'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Scale, Shield, CreditCard, Ban, AlertTriangle, UserX, Mail, Phone, MapPin, CheckCircle, Users, Lock, Calendar, ChevronRight, AlertCircle, Cookie } from 'lucide-react';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState('');
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    setHeaderVisible(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section]');
      let currentSection = '';

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.getAttribute('data-section') || '';
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const tableOfContents = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: FileText },
    { id: 'services', title: 'Description of Services', icon: CreditCard },
    { id: 'registration', title: 'User Registration', icon: Users },
    { id: 'user-conduct', title: 'User Conduct', icon: Shield },
    { id: 'payments', title: 'Payments and Fees', icon: CreditCard },
    { id: 'prohibited', title: 'Prohibited Activities', icon: Ban },
    { id: 'intellectual-property', title: 'Intellectual Property', icon: Lock },
    { id: 'limitation', title: 'Limitation of Liability', icon: AlertTriangle },
    { id: 'termination', title: 'Termination', icon: UserX },
    { id: 'governing-law', title: 'Governing Law', icon: Scale },
    { id: 'changes', title: 'Changes to Terms', icon: AlertCircle },
    { id: 'contact', title: 'Contact Us', icon: Mail }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-slate-900 pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        </div>

        <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto pt-6 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mb-4">
              <Scale className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-red-500 tracking-wide">TERMS OF SERVICE</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
              Terms and Conditions
            </h1>
            
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Please read these terms carefully before using ConnectPay services.
            </p>

            <div className="flex items-center justify-center space-x-2 text-gray-400 text-xs">
              <Calendar className="h-4 w-4" />
              <span>Last Updated: January 15, 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-4 lg:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Table of Contents - Sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Table of Contents</h3>
                  <nav className="space-y-2">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                          activeSection === item.id
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{item.title}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 lg:p-12">
                
                {/* Acceptance of Terms */}
                <div id="acceptance" data-section="acceptance" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Acceptance of Terms</h2>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Welcome to ConnectPay. By accessing or using our website, mobile application, or services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our services.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      These Terms constitute a legally binding agreement between you and ConnectPay Technologies Limited ("ConnectPay," "we," "us," or "our"). We reserve the right to modify these Terms at any time, and such modifications will be effective immediately upon posting.
                    </p>
                  </div>
                </div>

                {/* Description of Services */}
                <div id="services" data-section="services" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Description of Services</h2>
                  </div>
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      ConnectPay provides a digital payment platform that allows users to:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Purchase mobile airtime and data bundles</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Pay electricity bills and utility services</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Purchase cable TV subscriptions</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Pay for internet services</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Access other digital payment services</span>
                      </li>
                    </ul>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-6">
                      <p className="text-gray-900 font-semibold text-sm">
                        Our services are subject to availability and may be modified, suspended, or discontinued at any time without notice.
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Registration */}
                <div id="registration" data-section="registration" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Users className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">User Registration and Account</h2>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Account Requirements</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      To use our services, you must:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">Be at least 18 years of age</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">Provide accurate and complete registration information</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">Maintain the security of your account credentials</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">Notify us immediately of any unauthorized access</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">Accept full responsibility for all activities under your account</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* User Conduct */}
                <div id="user-conduct" data-section="user-conduct" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">User Conduct and Responsibilities</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      You agree to use our services only for lawful purposes and in accordance with these Terms. You are responsible for:
                    </p>
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Accurate Information</h4>
                        <p className="text-gray-700 text-sm">
                          Ensuring all information you provide is accurate, current, and complete.
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Account Security</h4>
                        <p className="text-gray-700 text-sm">
                          Maintaining the confidentiality of your account credentials and preventing unauthorized access.
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Lawful Use</h4>
                        <p className="text-gray-700 text-sm">
                          Using our services only for legitimate purposes and in compliance with all applicable laws.
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Transaction Verification</h4>
                        <p className="text-gray-700 text-sm">
                          Verifying all transaction details before confirming payment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payments and Fees */}
                <div id="payments" data-section="payments" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Payments and Fees</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      All payments are processed securely through our payment gateway. You agree to:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <CreditCard className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Pay all applicable fees and charges for services</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CreditCard className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Provide valid payment information</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CreditCard className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Accept that all sales are final unless otherwise stated in our Refund Policy</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CreditCard className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Understand that prices may change without prior notice</span>
                      </li>
                    </ul>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-6">
                      <p className="text-gray-900 font-semibold text-sm">
                        Transaction fees may apply. Please review our pricing before completing any transaction.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prohibited Activities */}
                <div id="prohibited" data-section="prohibited" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Ban className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Prohibited Activities</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      You may not use our services to:
                    </p>
                    <div className="grid gap-3">
                      <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg border border-red-200">
                        <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Engage in fraudulent or illegal activities</span>
                      </div>
                      <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg border border-red-200">
                        <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Attempt to gain unauthorized access to our systems</span>
                      </div>
                      <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg border border-red-200">
                        <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Use automated systems to access our services</span>
                      </div>
                      <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg border border-red-200">
                        <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Reverse engineer or attempt to extract source code</span>
                      </div>
                      <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg border border-red-200">
                        <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Interfere with or disrupt our services</span>
                      </div>
                      <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg border border-red-200">
                        <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Use our platform for money laundering or terrorist financing</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Intellectual Property */}
                <div id="intellectual-property" data-section="intellectual-property" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Lock className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Intellectual Property Rights</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      All content, features, and functionality on our platform, including but not limited to text, graphics, logos, icons, images, audio clips, and software, are the exclusive property of ConnectPay and are protected by Nigerian and international copyright, trademark, and other intellectual property laws.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit any of our content without our express written permission.
                    </p>
                  </div>
                </div>

                {/* Limitation of Liability */}
                <div id="limitation" data-section="limitation" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Limitation of Liability</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      To the fullest extent permitted by law, ConnectPay shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
                    </p>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm text-gray-700 mb-2">
                            Our services are provided "as is" without warranties of any kind, either express or implied.
                          </p>
                          <p className="text-sm text-gray-700">
                            We do not guarantee that our services will be uninterrupted, secure, or error-free.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Termination */}
                <div id="termination" data-section="termination" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <UserX className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Account Termination</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      We reserve the right to suspend or terminate your account at any time, without notice, for:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-3">
                        <UserX className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Violation of these Terms of Service</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <UserX className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Suspected fraudulent or illegal activity</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <UserX className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Non-payment of fees</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <UserX className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Extended period of inactivity</span>
                      </li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      You may also terminate your account at any time by contacting our support team.
                    </p>
                  </div>
                </div>

                {/* Governing Law */}
                <div id="governing-law" data-section="governing-law" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Scale className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Governing Law and Disputes</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising out of or relating to these Terms shall be resolved through arbitration in Lagos, Nigeria.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      You agree to attempt to resolve any disputes through good-faith negotiation before pursuing legal action.
                    </p>
                  </div>
                </div>

                {/* Changes to Terms */}
                <div id="changes" data-section="changes" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Changes to These Terms</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      We reserve the right to modify or update these Terms at any time. We will notify you of any material changes by posting the updated Terms on our website and updating the "Last Updated" date.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      Your continued use of our services after such modifications constitutes your acceptance of the updated Terms.
                    </p>
                  </div>
                </div>

               {/* Contact Us */}
                <div id="contact" data-section="contact" className="scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Mail className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Contact Us</h2>
                  </div>
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      If you have any questions about these Terms of Service, please contact us:
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                        <Mail className="h-6 w-6 text-red-600 mb-3" />
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Email</h4>
                        <a href="mailto:legal@connectpay.ng" className="text-red-600 hover:text-red-700 font-medium text-sm">
                          legal@connectpay.ng
                        </a>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <Phone className="h-6 w-6 text-blue-600 mb-3" />
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Phone</h4>
                        <a href="tel:+2348001234567" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          +234 800 123 4567
                        </a>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                        <MapPin className="h-6 w-6 text-green-600 mb-3" />
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Address</h4>
                        <p className="text-gray-700 text-xs">
                          123 Technology Drive<br />
                          Victoria Island, Lagos<br />
                          Nigeria
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Box */}
              <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Scale className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Legal Compliance</h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      ConnectPay is committed to operating in full compliance with Nigerian laws and regulations. We maintain transparency in all our dealings and protect the rights of our users.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
{/* Quick Links Section - Updated to remove Refund Policy */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Related Policies</h3>
            <p className="text-gray-600">Learn more about our policies and terms</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link href="/terms" className="group bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-gray-200 hover:border-red-500 transition-all duration-300">
              <FileText className="h-6 w-6 text-red-600 mb-2" />
              <h4 className="font-bold text-slate-900 mb-1 text-sm group-hover:text-red-600 transition-colors">Terms of Service</h4>
              <p className="text-gray-600 text-xs mb-2">Our terms and conditions for using our services</p>
              <span className="text-red-600 text-xs font-semibold flex items-center">
                Read More <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link href="/cookies" className="group bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-gray-200 hover:border-blue-500 transition-all duration-300">
              <Cookie className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-bold text-slate-900 mb-1 text-sm group-hover:text-blue-600 transition-colors">Cookie Policy</h4>
              <p className="text-gray-600 text-xs mb-2">How we use cookies and tracking technologies</p>
              <span className="text-blue-600 text-xs font-semibold flex items-center">
                Read More <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link href="/refund-policy" className="group bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-gray-200 hover:border-green-500 transition-all duration-300">
              <AlertCircle className="h-6 w-6 text-green-600 mb-2" />
              <h4 className="font-bold text-slate-900 mb-1 text-sm group-hover:text-green-600 transition-colors">Refund Policy</h4>
              <p className="text-gray-600 text-xs mb-2">Our refund and cancellation policy</p>
              <span className="text-green-600 text-xs font-semibold flex items-center">
                Read More <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}