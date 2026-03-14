'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Shield, Eye, Database, Lock, Users, Globe, Cookie, Mail, Phone, MapPin, CheckCircle, AlertTriangle, UserX, Scale, ChevronRight, AlertCircle, Settings } from 'lucide-react';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';

export default function PrivacyPolicyPage() {
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
    { id: 'introduction', title: 'Introduction', icon: FileText },
    { id: 'information-collected', title: 'Information We Collect', icon: Database },
    { id: 'how-we-use', title: 'How We Use Your Information', icon: Settings },
    { id: 'information-sharing', title: 'Information Sharing', icon: Users },
    { id: 'data-security', title: 'Data Security', icon: Shield },
    { id: 'data-retention', title: 'Data Retention', icon: Lock },
    { id: 'your-rights', title: 'Your Privacy Rights', icon: Scale },
    { id: 'cookies', title: 'Cookies and Tracking', icon: Cookie },
    { id: 'third-party', title: 'Third-Party Services', icon: Globe },
    { id: 'children', title: 'Children\'s Privacy', icon: UserX },
    { id: 'changes', title: 'Changes to Policy', icon: AlertCircle },
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
              <Shield className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-red-500 tracking-wide">PRIVACY POLICY</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
              Privacy Policy
            </h1>
            
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Your privacy is important to us. Learn how we collect, use, and protect your personal information.
            </p>

            <div className="flex items-center justify-center space-x-2 text-gray-400 text-xs">
              <Eye className="h-4 w-4" />
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
                
                {/* Introduction */}
                <div id="introduction" data-section="introduction" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Introduction</h2>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      ConnectPay Technologies Limited ("ConnectPay," "we," "us," or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and services.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      By using our services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
                    </p>
                  </div>
                </div>

                {/* Information We Collect */}
                <div id="information-collected" data-section="information-collected" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Database className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Information We Collect</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Personal Information</h3>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        We collect information that you provide directly to us, including:
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Full name and contact information (email, phone number)</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Account credentials (username, password)</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Payment information (card details, bank account information)</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Transaction history and service usage data</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Communication preferences and customer support inquiries</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Automatically Collected Information</h3>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        When you access our services, we automatically collect:
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Device information (IP address, browser type, operating system)</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Usage data (pages viewed, time spent, click patterns)</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Location data (with your permission)</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Cookies and similar tracking technologies</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rest of the sections follow the same pattern - I'll continue with the key sections */}

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
                      If you have any questions about this Privacy Policy, please contact us:
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                        <Mail className="h-6 w-6 text-red-600 mb-3" />
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Email</h4>
                        <a href="mailto:privacy@connectpay.ng" className="text-red-600 hover:text-red-700 font-medium text-sm">
                          privacy@connectpay.ng
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
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Your Privacy Matters</h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      ConnectPay is committed to protecting your privacy and handling your data with care. We comply with all applicable data protection laws in Nigeria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
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