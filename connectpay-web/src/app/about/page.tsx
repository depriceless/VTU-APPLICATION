'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  Target,
  Eye,
  Heart,
  Shield,
  Zap,
  TrendingUp,
  Users,
  Award,
  Globe,
  Clock
} from 'lucide-react';
import { 
  FaMobileAlt, 
  FaWifi, 
  FaTv, 
  FaBolt 
} from 'react-icons/fa';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';

const VALUES = [
  {
    icon: Zap,
    title: 'Speed',
    description: 'We believe your time is valuable. That\'s why we deliver services in 10 seconds or less.',
    color: 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600'
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Your trust is our priority. We use bank-grade encryption and protect every transaction.',
    color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600'
  },
  {
    icon: Heart,
    title: 'Customer Care',
    description: '24/7 support that responds in under 2 minutes. We\'re here when you need us.',
    color: 'bg-red-50 text-red-600 group-hover:bg-red-600'
  },
  {
    icon: Award,
    title: 'Transparency',
    description: 'No hidden fees, no surprises. What you see is what you pay, always.',
    color: 'bg-green-50 text-green-600 group-hover:bg-green-600'
  },
];

const TEAM_VALUES = [
  'Customer obsession over competitor focus',
  'Long-term thinking over short-term gains',
  'Innovation over convention',
  'Execution over perfection',
  'Simplicity over complexity',
  'Transparency over opacity'
];

export default function AboutPage() {
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    setHeaderVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section - No Gradients */}
      <section className="relative bg-slate-900 pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-slate-900" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto pt-6 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mb-4">
              <Sparkles className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-red-500 tracking-wide">ABOUT CONNECTPAY</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
              We're Making Digital Services
              <span className="block mt-2 text-red-400">Simple & Accessible</span>
            </h1>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Globe className="w-4 h-4" />
                Our Story
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Empowering Nigeria's Digital Future
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  In 2020, we noticed a problem: Nigerians were spending hours buying airtime, data, and paying bills. 
                  Long queues, failed transactions, and inflated prices were the norm.
                </p>
                <p>
                  We asked ourselves: "Why should buying airtime be harder than sending a text message?"
                </p>
                <p>
                  So we built ConnectPay - a platform where you can top up airtime in 10 seconds, buy data at 30% discount, 
                  and pay bills from the comfort of your bed at 3am.
                </p>
                <p className="font-semibold text-gray-900">
                  Today, we've processed over ₦2.8 billion in transactions for 50,000+ happy customers across Nigeria.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl border-2 border-red-100">
                    <FaMobileAlt className="w-10 h-10 text-red-600 mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">Instant Airtime</h3>
                    <p className="text-sm text-gray-600">Delivered in 10 seconds</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-100">
                    <FaWifi className="w-10 h-10 text-blue-600 mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">Cheap Data</h3>
                    <p className="text-sm text-gray-600">Save up to 30%</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                    <FaTv className="w-10 h-10 text-purple-600 mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">Cable TV</h3>
                    <p className="text-sm text-gray-600">24/7 availability</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-2xl border-2 border-green-100">
                    <FaBolt className="w-10 h-10 text-green-600 mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">Electricity</h3>
                    <p className="text-sm text-gray-600">Instant tokens</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:shadow-lg transition-all">
              <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                To make digital services instantly accessible and affordable to every Nigerian, 
                regardless of location or time of day. We believe everyone deserves fast, 
                reliable service without the stress.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-3">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                To become Africa's most trusted digital services platform, setting the standard 
                for speed, reliability, and customer care. We're building the future of 
                digital commerce in Nigeria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Heart className="w-4 h-4" />
              Our Values
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Drives Us Every Day</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These principles guide everything we do at ConnectPay
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map((value, idx) => (
              <div key={idx} className="group bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 ${value.color} rounded-lg flex items-center justify-center mb-3 transition-all group-hover:text-white`}>
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Impact */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-3">
              <Award className="w-4 h-4" />
              Our Impact
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Making a Difference</h2>
            <p className="text-sm text-gray-600">
              See how we're transforming digital services across Nigeria
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-red-300 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed text-xs">
                We deliver 99.9% of transactions in under 10 seconds, making us the fastest platform in Nigeria.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">💰</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Massive Savings</h3>
              <p className="text-gray-600 leading-relaxed text-xs">
                Our customers save an average of ₦15,000 annually on data and airtime purchases.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Secure Transactions</h3>
              <p className="text-gray-600 leading-relaxed text-xs">
                Bank-grade encryption protects over ₦2.8B in transactions with zero security breaches.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">🏆</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Award Winning</h3>
              <p className="text-gray-600 leading-relaxed text-xs">
                Recognized as "Best Digital Services Platform" for excellence and innovation.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Growing Community</h3>
              <p className="text-gray-600 leading-relaxed text-xs">
                From 0 to 50,000+ active users in just 4 years, trusted across all Nigerian states.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-pink-300 hover:shadow-md transition-all">
              <div className="text-2xl mb-2">💡</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Always Innovating</h3>
              <p className="text-gray-600 leading-relaxed text-xs">
                Continuous platform improvements with 24/7 support and instant delivery guarantee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Culture */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Heart className="w-4 h-4" />
              Our Culture
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What We Believe In</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The values that guide every decision we make
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {TEAM_VALUES.map((value, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-gray-200 hover:border-red-300 hover:shadow-lg transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-lg mb-1 group-hover:text-red-600 transition-colors">
                      {value.split(' over ')[0]}
                    </p>
                    <p className="text-gray-600">
                      over {value.split(' over ')[1]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}