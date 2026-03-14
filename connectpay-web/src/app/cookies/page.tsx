'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Shield, FileText, Settings, Database, Ban, CheckCircle, AlertCircle, ChevronRight, Calendar, Mail, Phone, MapPin, Eye, Trash2, Lock, Settings as SettingsIcon } from 'lucide-react';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';

export default function CookiePolicyPage() {
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
    { id: 'what-are-cookies', title: 'What Are Cookies', icon: Cookie },
    { id: 'types-of-cookies', title: 'Types of Cookies', icon: Settings },
    { id: 'how-we-use', title: 'How We Use Cookies', icon: Database },
    { id: 'third-party', title: 'Third-Party Cookies', icon: Shield },
    { id: 'managing-cookies', title: 'Managing Cookies', icon: SettingsIcon },
    { id: 'do-not-track', title: 'Do Not Track Signals', icon: Ban },
    { id: 'updates', title: 'Policy Updates', icon: AlertCircle },
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
              <Cookie className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-red-500 tracking-wide">COOKIE POLICY</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
              Our Cookie Policy
            </h1>
            
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Learn how we use cookies and similar technologies on ConnectPay.
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
                      This Cookie Policy explains how ConnectPay ("we," "us," or "our") uses cookies and similar technologies to recognize you when you visit our website at connectpay.ng ("Website"). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      In some cases, we may use cookies to collect personal information, or information that becomes personal information if we combine it with other information.
                    </p>
                  </div>
                </div>

                {/* What Are Cookies */}
                <div id="what-are-cookies" data-section="what-are-cookies" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Cookie className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">What Are Cookies?</h2>
                  </div>
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
                    </p>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                      <p className="text-gray-900 font-semibold text-sm">
                        Cookies set by the website owner (in this case, ConnectPay) are called "first-party cookies." Cookies set by parties other than the website owner are called "third-party cookies."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Types of Cookies */}
                <div id="types-of-cookies" data-section="types-of-cookies" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Settings className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Types of Cookies We Use</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We use the following types of cookies on our Website:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Essential Cookies</h4>
                        <p className="text-gray-700 text-sm">
                          These cookies are strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas. Without these cookies, certain functionality may become unavailable.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Performance Cookies</h4>
                        <p className="text-gray-700 text-sm">
                          These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Functionality Cookies</h4>
                        <p className="text-gray-700 text-sm">
                          These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Targeting Cookies</h4>
                        <p className="text-gray-700 text-sm">
                          These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant advertisements on other sites.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How We Use Cookies */}
                <div id="how-we-use" data-section="how-we-use" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Database className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">How We Use Cookies</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We use cookies for various purposes including:
                    </p>
                    
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">To keep you signed in to your account</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">To remember your preferences and settings</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">To understand how you use our Website</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">To provide personalized content and advertisements</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">To improve our services and user experience</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700">To detect and prevent fraud</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Third-Party Cookies */}
                <div id="third-party" data-section="third-party" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Third-Party Cookies</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Website, deliver advertisements on and through the Website, and so on.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Analytics Services</h4>
                        <p className="text-gray-700 text-sm">
                          We use Google Analytics to collect information about how visitors use our Website. The cookies collect information in an anonymous form, including the number of visitors, where visitors have come from, and the pages they visited.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Advertising Partners</h4>
                        <p className="text-gray-700 text-sm">
                          Our advertising partners may use cookies to collect information about your activities on this and other websites to provide you with targeted advertising.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="font-bold text-slate-900 mb-2">Social Media</h4>
                        <p className="text-gray-700 text-sm">
                          Our Website may include social media features, such as Facebook "Like" buttons, that may set cookies to recognize you when you visit our Website.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Managing Cookies */}
                <div id="managing-cookies" data-section="managing-cookies" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <SettingsIcon className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Managing Cookies</h2>
                  </div>
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, since it will no longer be personalized to you.
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <Eye className="h-5 w-5 text-red-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Browser Settings</h4>
                        <p className="text-gray-700 text-xs">
                          You can manage cookie preferences through your browser settings. Most browsers allow you to refuse or accept cookies.
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <Settings className="h-5 w-5 text-red-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Cookie Consent</h4>
                        <p className="text-gray-700 text-xs">
                          When you first visit our Website, you will be presented with a cookie consent banner where you can manage your preferences.
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Cookie Deletion</h4>
                        <p className="text-gray-700 text-xs">
                          You can delete cookies that are already on your device by clearing your browser's history.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5 mr-3" />
                        <p className="text-sm text-gray-700">
                          Please note that if you disable cookies, some features of our Website may not function properly, and you may not be able to use certain services that require you to be signed in.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Do Not Track Signals */}
                <div id="do-not-track" data-section="do-not-track" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <Ban className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Do Not Track Signals</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      Some browsers have a "Do Not Track" feature that lets you tell websites that you do not want to have your online activities tracked. At this time, we do not respond to browser "Do Not Track" signals.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      We adhere to the standards set out in this Cookie Policy and do not monitor or respond to Do Not Track browser requests.
                    </p>
                  </div>
                </div>

                {/* Updates */}
                <div id="updates" data-section="updates" className="mb-12 scroll-mt-24">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Policy Updates</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      We may update this Cookie Policy from time to time to reflect changes to our practices or for other operational, legal, or regulatory reasons.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      We encourage you to periodically review this page for the latest information on our cookie practices. The "Last Updated" date at the top of this page indicates when this Cookie Policy was last revised.
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
                      If you have any questions about our use of cookies or other technologies, please contact us:
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <Mail className="h-5 w-5 text-red-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Email</h4>
                        <a href="mailto:privacy@connectpay.ng" className="text-red-600 hover:text-red-700 font-medium text-sm">
                          privacy@connectpay.ng
                        </a>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <Phone className="h-5 w-5 text-red-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Phone</h4>
                        <a href="tel:+2348001234567" className="text-red-600 hover:text-red-700 font-medium text-sm">
                          +234 800 123 4567
                        </a>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <MapPin className="h-5 w-5 text-red-600" />
                        </div>
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
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Your Privacy Choices</h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      You have control over how cookies are used on our Website. Use the cookie consent manager or your browser settings to customize your preferences according to your comfort level.
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