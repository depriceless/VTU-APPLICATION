'use client';

import React, { useState, useEffect } from 'react';  // Now imported!
import Link from 'next/link';
import { 
  Smartphone, Wifi, Tv, Zap, Printer, Globe, GraduationCap, DollarSign, 
  ArrowRight, Clock, Shield, Users, ChevronDown, CheckCircle, Sparkles, 
  Star, Award, Percent, TrendingUp
} from 'lucide-react';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';

const SERVICES = [
  { 
    icon: Smartphone, 
    name: 'Airtime Top-Up', 
    desc: 'Top up any phone in 10 seconds - even at 3am. Cheaper than buying from vendors.',
    savings: 'Save ₦50',
    link: '/services/airtime',
    dashboardLink: '/dashboard/airtime'
  },
  { 
    icon: Wifi, 
    name: 'Data Bundles', 
    desc: 'Save up to 30% on data vs buying directly from networks. All plans, instant delivery.',
    savings: 'Save 30%',
    link: '/services/data',
    dashboardLink: '/dashboard/data'
  },
  { 
    icon: Tv, 
    name: 'Cable TV', 
    desc: 'Never miss your favorite shows - renew DSTV, GOTV, Startimes instantly.',
    savings: '24/7 Available',
    link: '/services/cabletv',
    dashboardLink: '/dashboard/cabletv'
  },
  { 
    icon: Zap, 
    name: 'Electricity', 
    desc: 'No more blackouts - buy electricity tokens 24/7 from your phone. Instant delivery.',
    savings: 'Instant Tokens',
    link: '/services/electricity',
    dashboardLink: '/dashboard/electricity'
  },
  { 
    icon: Printer, 
    name: 'Print Recharge', 
    desc: 'Start a recharge card business with zero capital. Generate pins in seconds.',
    savings: 'Bulk Discount',
    link: '/services/print-recharge',
    dashboardLink: '/dashboard/print-recharge'
  },
  { 
    icon: Globe, 
    name: 'Internet', 
    desc: 'Pay for Spectranet, Smile & more. Never lose connection during important work.',
    savings: 'Best Rates',
    link: '/services/internet',
    dashboardLink: '/dashboard/internet'
  },
  { 
    icon: GraduationCap, 
    name: 'Education', 
    desc: 'WAEC, NECO, JAMB result checker PINs delivered instantly to your email.',
    savings: 'Email Delivery',
    link: '/services/education',
    dashboardLink: '/dashboard/education'
  },
  { 
    icon: DollarSign, 
    name: 'Betting & Wallet', 
    desc: 'Fund Bet9ja, 1xBet wallets instantly. No failed deposits, guaranteed.',
    savings: '0% Fee',
    link: '/services/betting',
    dashboardLink: '/dashboard/betting'
  },
];

const FEATURES = [
  { 
    icon: Clock, 
    title: '10-Second Delivery', 
    desc: 'Your airtime arrives in 10 seconds or we refund you double. Guaranteed.',
    stat: '99.9% Success'
  },
  { 
    icon: Shield, 
    title: 'Bank-Level Security', 
    desc: '256-bit encryption + ₦10M insurance coverage. Your money is completely safe.',
    stat: '₦2.8B Secured'
  },
  { 
    icon: Users, 
    title: '2-Minute Support', 
    desc: 'Our support team responds in under 2 minutes, 24/7. Real humans, not bots.',
    stat: '4.8★ Rating'
  },
];

const STEPS = [
  { 
    num: '1', 
    title: 'Sign Up in 60 Seconds', 
    desc: 'Just your phone number & email. No documents needed. Start immediately.',
    icon: '📱'
  },
  { 
    num: '2', 
    title: 'Add Money Instantly', 
    desc: 'Bank transfer, card, or USSD - whichever you prefer. ₦100 minimum.',
    icon: '💳'
  },
  { 
    num: '3', 
    title: 'Buy & Get Delivered', 
    desc: 'Service delivered in 10 seconds. Money-back guarantee if we fail.',
    icon: '⚡'
  },
];

const NETWORKS = [
  { name: 'MTN', logo: '/assets/images/mtnlogo.jpg' },
  { name: 'Airtel', logo: '/assets/images/Airtelogo.png' },
  { name: 'Glo', logo: '/assets/images/glologo.png' },
  { name: '9mobile', logo: '/assets/images/9mobilelogo.jpg' }
];

const NETWORK_PLANS = {
  MTN: [
    { size: '500MB', price: '135', duration: '30 days', popular: false },
    { size: '1GB', price: '270', duration: '30 days', popular: true },
    { size: '2GB', price: '540', duration: '30 days', popular: false },
    { size: '5GB', price: '1350', duration: '30 days', popular: false },
  ],
  Airtel: [
    { size: '500MB', price: '140', duration: '30 days', popular: false },
    { size: '1GB', price: '280', duration: '30 days', popular: true },
    { size: '2GB', price: '560', duration: '30 days', popular: false },
    { size: '5GB', price: '1400', duration: '30 days', popular: false },
  ],
  Glo: [
    { size: '500MB', price: '125', duration: '30 days', popular: false },
    { size: '1GB', price: '250', duration: '30 days', popular: true },
    { size: '2GB', price: '500', duration: '30 days', popular: false },
    { size: '5GB', price: '1250', duration: '30 days', popular: false },
  ],
  '9mobile': [
    { size: '500MB', price: '130', duration: '30 days', popular: false },
    { size: '1GB', price: '260', duration: '30 days', popular: true },
    { size: '2GB', price: '520', duration: '30 days', popular: false },
    { size: '5GB', price: '1300', duration: '30 days', popular: false },
  ],
};

const FAQS = [
  {
    question: "How quickly will I receive my airtime or data?",
    answer: "Instant delivery in 10 seconds or less! 99.9% of transactions complete within 10 seconds. If it takes longer, we'll refund you double your money - that's our guarantee."
  },
  {
    question: "What if the transaction fails and I get debited?",
    answer: "We automatically refund you within 5 minutes + ₦50 compensation for the inconvenience. Zero stress, zero hassle. You can also contact our 24/7 support team who responds in under 2 minutes."
  },
  {
    question: "Is my money safe with ConnectPay?",
    answer: "Absolutely! We use bank-grade 256-bit SSL encryption and are PCI DSS compliant. We've processed over ₦2.8 billion in transactions with a 99.9% success rate. Your money is safer than in your pocket."
  },
  {
    question: "Do I need to verify my account to start buying?",
    answer: "No! Start buying immediately after registration. Verification is only needed for transactions above ₦50,000/day. Most users never need to verify."
  },
  {
    question: "What payment methods do you accept?",
    answer: "Bank transfers (instant), Debit/Credit cards (Visa, Mastercard, Verve), USSD codes, and direct wallet funding. Choose whatever works best for you."
  },
  {
    question: "Are there any hidden charges?",
    answer: "Zero hidden charges! Our transparent pricing shows all fees upfront before you complete any transaction. What you see is exactly what you pay. No surprises."
  },
  {
    question: "Can I get a refund if something goes wrong?",
    answer: "Yes! Failed transactions are automatically refunded within 5 minutes. For any issues, our 24/7 support team will resolve it immediately. We process thousands of refunds daily without hassle."
  },
  {
    question: "Do you offer bulk purchase discounts?",
    answer: "Yes! We offer special rates for bulk purchases and resellers. Contact our sales team for custom pricing that can save you up to 40% on large orders."
  }
];

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  
  useEffect(() => {
    // Check if token exists in localStorage or sessionStorage (client-side only)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, []);

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-2.5 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">🔥 Limited Offer:</span>
          <span className="font-bold">Register & Get ₦100 Free Bonus</span>
          <span className="hidden sm:inline">+ Save 30% on First Data Purchase</span>
        </div>
      </div>

      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] lg:min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/images/heroimg.jpg" 
            alt="Hero Background" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Professional Welcome Text */}
            <div className="mb-6">
              <p className="text-red-400 text-sm sm:text-base font-semibold tracking-wider uppercase mb-2">
                Welcome to ConnectPay
              </p>
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto"></div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Buy Airtime & Data in{' '}
              <span className="text-red-500 relative">
                10 Seconds
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M1 5C50 2 150 2 199 5" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>

            <p className="text-xl lg:text-2xl text-gray-300 mb-10">
              Save up to 30% on data. Instant delivery. Trusted platform.
            </p>

            <div>
              <Link 
                href="/register"
                className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-2xl transform hover:scale-105 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden lg:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
          <ChevronDown className="w-7 h-7 text-white" />
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              Our Services
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Save money and time with Nigeria's most trusted digital services platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((service, idx) => {
              // Determine the correct link based on login status
              const targetLink = isLoggedIn ? service.dashboardLink : '/register';
              
              return (
                <Link 
                  key={idx} 
                  href={targetLink}
                  className="group bg-white p-6 rounded-2xl border-2 border-gray-200 hover:border-red-600 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2"
                >
                  <div className="mb-4">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-600 transition-all duration-300">
                      <service.icon className="w-7 h-7 text-red-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                    <Percent className="w-3 h-3" />
                    {service.savings}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {service.desc}
                  </p>

                  <div className="flex items-center gap-2 text-red-600 font-semibold text-sm transition-all">
                    Buy Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Pricing Section */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              Transparent Pricing
            </span>
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Data Plans for All Networks</h3>
            <p className="text-gray-600">No hidden fees • Instant delivery • Best rates guaranteed</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {NETWORKS.map((network, idx) => {
              const plans = NETWORK_PLANS[network.name] || [];
              return (
                <div key={idx} className="bg-white rounded-2xl border-2 border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  {/* Network Header */}
                  <div className="bg-gradient-to-br from-gray-50 to-white p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm">
                        <img 
                          src={network.logo} 
                          alt={`${network.name} Logo`} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        Save up to 30%
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">{network.name} Data</h4>
                  </div>

                  {/* Pricing List */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {plans.map((plan, planIdx) => (
                        <div 
                          key={planIdx} 
                          className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                            plan.popular ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{plan.size}</span>
                              {plan.popular && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">
                                  Popular
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{plan.duration}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">₦{plan.price}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Link 
                      href={isLoggedIn ? '/dashboard/data' : '/register'}
                      className="mt-6 block w-full text-center bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all text-sm"
                    >
                      Buy {network.name} Data
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">
              All prices shown are our discounted rates. Direct purchase from networks costs more.
            </p>
            <Link 
              href="/pricing" 
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-sm"
            >
              View all plans and networks
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <CheckCircle className="w-4 h-4" />
              Simple Process
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Get Started in 3 Easy Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join 50,000+ users who complete their first purchase in under 2 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-200 to-transparent"></div>

            {STEPS.map((step, idx) => (
              <div key={idx} className="relative text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300 z-10 relative">
                    {step.icon}
                  </div>
                  <div className="absolute inset-0 w-24 h-24 mx-auto bg-red-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-300"></div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link 
              href="/register"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
            >
              Start Your First Purchase
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features / Why Choose Us */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Star className="w-4 h-4" />
              Why Choose Us
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why 50,000+ Nigerians Trust ConnectPay
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the difference with Nigeria's fastest-growing digital services platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="group bg-white p-8 rounded-3xl border-2 border-gray-200 hover:border-red-600 hover:shadow-2xl transition-all duration-500">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {feature.desc}
                </p>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    {feature.stat}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4 block">FAQ</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Got Questions? We've Got Answers</h2>
            <p className="text-xl text-gray-600">Everything you need to know about ConnectPay</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-red-300 transition-all">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-100 transition-all"
                >
                  <span className="font-bold text-gray-900 text-lg pr-4">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform duration-300 ${faqOpen[idx] ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${faqOpen[idx] ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Link href="/contact" className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold">
              Contact Our 24/7 Support Team
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}