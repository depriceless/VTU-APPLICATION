'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, Tv, Zap, Printer, Globe, GraduationCap, DollarSign, ArrowRight, Clock, Shield, Users, Menu, X, ChevronDown, CheckCircle, Sparkles, CreditCard, BarChart3, Phone, Mail, MapPin, Star } from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [balance, setBalance] = useState(25450);
  const [isAnimating, setIsAnimating] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [headerBg, setHeaderBg] = useState(false);
  const [liveStats, setLiveStats] = useState({
    activeUsers: 10247,
    transactionsToday: 15632,
    moneyProcessed: 2847500,
    uptime: 99.9
  });
  const [hasAnimatedStats, setHasAnimatedStats] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setHeaderBg(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live stats animation and random updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 3),
        transactionsToday: prev.transactionsToday + Math.floor(Math.random() * 5),
        moneyProcessed: prev.moneyProcessed + Math.floor(Math.random() * 10000),
        uptime: 99.9
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { icon: Smartphone, name: 'Airtime', desc: 'Instant airtime top-up for all networks', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { icon: Wifi, name: 'Data Bundles', desc: 'Affordable data plans for MTN, Glo, Airtel, 9mobile', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { icon: Tv, name: 'Cable TV', desc: 'DSTV, GOTV, Startimes subscriptions', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { icon: Zap, name: 'Electricity', desc: 'Pay your electricity bills instantly', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { icon: Printer, name: 'Print Recharge', desc: 'Generate recharge pins easily', color: 'text-green-600', bgColor: 'bg-green-50' },
    { icon: Globe, name: 'Internet', desc: 'Internet subscription payments', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    { icon: GraduationCap, name: 'Education', desc: 'WAEC, NECO, JAMB result checker', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { icon: DollarSign, name: 'Betting & Transfer', desc: 'Fund betting wallets and transfers', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  ];

  const features = [
    { icon: Clock, title: 'Instant Delivery', desc: 'Get your services delivered in seconds' },
    { icon: Shield, title: 'Secure & Safe', desc: 'Your transactions are 100% secure' },
    { icon: Users, title: '24/7 Support', desc: 'We are always here to help you' },
  ];

  const steps = [
    { num: '1', title: 'Register', desc: 'Create your free account in minutes' },
    { num: '2', title: 'Fund Wallet', desc: 'Add money to your wallet securely' },
    { num: '3', title: 'Make Purchase', desc: 'Buy any service instantly' },
  ];

  const heroTexts = [
    { main: 'Digital Services', sub: 'Buy airtime, data, pay bills, and more - all in one place' },
    { main: 'Bill Payments', sub: 'Pay for electricity, cable TV, and internet with zero stress' },
    { main: 'Data & Airtime', sub: 'Get instant top-ups for all major networks at the best rates' },
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % heroTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveService((prev) => (prev + 1) % 8);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleServiceClick = (amount) => {
    if (!isAnimating) {
      setIsAnimating(true);
      setBalance(prev => prev - amount);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const handleAddMoney = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setBalance(prev => prev + 5000);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const leftTransform = -scrollY * 0.4;
  const rightTransform = scrollY * 0.4;
  const opacity = Math.max(1 - scrollY / 600, 0);
  const scale = Math.max(1 - scrollY / 2000, 0.8);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-red-900 text-red-50 py-2.5 px-4 sm:px-6 lg:px-8 text-sm hidden lg:block fixed top-0 w-full z-50 border-b border-red-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              <span>+234 800 123 4567</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              <span>support@connectpay.ng</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>Lagos, Nigeria</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className={`fixed lg:top-[41px] top-0 w-full z-40 transition-all duration-300 ${headerBg ? 'bg-white shadow-lg border-b border-gray-100' : 'bg-white/95 shadow-md'}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-xl blur-sm opacity-50"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">ConnectPay</span>
                <p className="text-xs text-gray-500 font-medium">Digital Services Platform</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center space-x-1">
              <a href="#home" className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition rounded-lg hover:bg-red-50">Home</a>
              <div className="relative group">
                <button className="flex items-center gap-1 px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition rounded-lg hover:bg-red-50">
                  Services
                  <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">Our Services</h3>
                      <p className="text-xs text-gray-500">Comprehensive digital solutions for you</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {services.map((service, idx) => (
                        <a key={idx} href="#services" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group/item transform hover:scale-105">
                          <div className={`w-11 h-11 ${service.bgColor} rounded-xl flex items-center justify-center group-hover/item:shadow-md transition-all`}>
                            <service.icon className={`w-5 h-5 ${service.color}`} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-900 block">{service.name}</span>
                            <span className="text-xs text-gray-500">Available 24/7</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <a href="#how-it-works" className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition rounded-lg hover:bg-red-50">How It Works</a>
              <a href="#features" className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition rounded-lg hover:bg-red-50">Why Us</a>
              <a href="#pricing" className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition rounded-lg hover:bg-red-50">Pricing</a>
              <a href="#contact" className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition rounded-lg hover:bg-red-50">Contact</a>
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <button className="text-gray-700 hover:text-red-600 font-semibold px-5 py-2.5 rounded-lg transition hover:bg-gray-50">Sign In</button>
              <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-lg flex items-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button className="lg:hidden text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 py-4 space-y-1">
              <a href="#home" className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition">Home</a>
              <div>
                <button onClick={() => setServicesOpen(!servicesOpen)} className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition">
                  Services
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`} />
                </button>
                {servicesOpen && (
                  <div className="pl-4 mt-2 space-y-1">
                    {services.slice(0, 6).map((service, idx) => (
                      <a key={idx} href="#services" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <service.icon className={`w-4 h-4 ${service.color}`} />
                        {service.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <a href="#how-it-works" className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition">How It Works</a>
              <a href="#features" className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition">Why Us</a>
              <a href="#pricing" className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition">Pricing</a>
              <a href="#contact" className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition">Contact</a>
              <div className="pt-4 space-y-3 border-t border-gray-100 mt-4">
                <button className="w-full text-gray-700 hover:text-red-600 font-semibold py-3 border-2 border-gray-200 hover:border-red-600 rounded-lg transition">Sign In</button>
                <button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-semibold shadow-lg transition">Get Started Free</button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="lg:pt-44 pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 via-white to-orange-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8" style={{ transform: `translateX(${leftTransform}px)`, opacity: opacity, transition: 'transform 0.05s linear, opacity 0.1s linear' }}>
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">Trusted by 10,000+ Users</span>
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                  Your One-Stop Platform for All{' '}
                  <span className="relative inline-block">
                    <span className="text-red-600 transition-all duration-500">{heroTexts[currentTextIndex].main}</span>
                    <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></span>
                  </span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed transition-all duration-500">{heroTexts[currentTextIndex].sub}. Fast, secure, and reliable at your fingertips.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button className="group bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2 transition-all transform hover:scale-105 hover:shadow-2xl shadow-lg">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="group border-2 border-gray-300 hover:border-red-600 hover:bg-red-50 text-gray-700 hover:text-red-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all">Watch Demo</button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Instant activation</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
                <div>
                  <p className="text-3xl font-bold text-gray-900">10K+</p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">99.9%</p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">₦2M+</p>
                  <p className="text-sm text-gray-600">Processed</p>
                </div>
              </div>
            </div>

            <div className="relative" style={{ transform: `translateX(${rightTransform}px) scale(${scale})`, opacity: opacity, transition: 'transform 0.05s linear, opacity 0.1s linear, scale 0.1s linear' }}>
              <div className="relative mx-auto w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-orange-400 rounded-3xl blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gray-900 rounded-3xl p-3 shadow-2xl">
                  <div className="bg-white rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 text-white">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <p className="text-sm opacity-90">Available Balance</p>
                          <p className={`text-3xl font-bold transition-all duration-500 ${isAnimating ? 'scale-110' : 'scale-100'}`}>₦{balance.toLocaleString()}.00</p>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <Smartphone className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleAddMoney} className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 py-3 rounded-lg font-medium transition-all text-sm active:scale-95">Add Money</button>
                        <button className="flex-1 bg-white text-red-600 hover:bg-gray-100 py-3 rounded-lg font-medium transition-all text-sm active:scale-95">Send Money</button>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">Quick Actions</p>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3">
                        {services.slice(0, 8).map((service, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-2" onClick={() => handleServiceClick(Math.floor(Math.random() * 3000) + 1000)}>
                            <div className={`w-12 h-12 ${activeService === idx ? service.bgColor : 'bg-gray-100'} rounded-xl flex items-center justify-center hover:${service.bgColor} transition-all cursor-pointer transform hover:scale-110 active:scale-95 ${activeService === idx ? 'ring-2 ring-offset-2 ring-red-500' : ''}`}>
                              <service.icon className={`w-6 h-6 ${service.color} transition-transform ${activeService === idx ? 'scale-110' : 'scale-100'}`} />
                            </div>
                            <span className="text-xs text-gray-600 text-center">{service.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 space-y-3">
                        <p className="font-semibold text-gray-900">Recent Transactions</p>
                        {[
                          { icon: Wifi, name: 'MTN Data', amount: '₦1,500', time: '2 mins ago', color: 'text-purple-600', bgColor: 'bg-purple-50' },
                          { icon: Zap, name: 'Electricity', amount: '₦5,000', time: '1 hour ago', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
                          { icon: Tv, name: 'DSTV', amount: '₦8,200', time: '3 hours ago', color: 'text-orange-600', bgColor: 'bg-orange-50' },
                        ].map((transaction, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${transaction.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <transaction.icon className={`w-5 h-5 ${transaction.color}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{transaction.name}</p>
                                <p className="text-xs text-gray-500">{transaction.time}</p>
                              </div>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">-{transaction.amount}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 hidden lg:block animate-bounce">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">This Month</p>
                    <p className="font-semibold text-gray-900">₦150K+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Trusted Networks */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">Trusted Partners</p>
            <h3 className="text-2xl font-bold text-gray-900">Supporting All Major Networks</h3>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-20 opacity-70 hover:opacity-100 transition-opacity">
            <div className="group flex flex-col items-center gap-3">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-4 border border-gray-100">
                <img 
                  src="/assets/images/mtnlogo.jpg" 
                  alt="MTN Nigeria" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-yellow-400 rounded-xl flex items-center justify-center"><span class="text-3xl font-black text-gray-900">MTN</span></div>';
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">MTN Nigeria</span>
            </div>
            
            <div className="group flex flex-col items-center gap-3">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-4 border border-gray-100">
                <img 
                  src="/assets/images/Airtelogo.png" 
                  alt="Airtel Nigeria" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-red-600 rounded-xl flex items-center justify-center"><span class="text-2xl font-bold text-white">airtel</span></div>';
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">Airtel Nigeria</span>
            </div>
            
            <div className="group flex flex-col items-center gap-3">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-4 border border-gray-100">
                <img 
                  src="/assets/images/glologo.png" 
                  alt="Glo Mobile" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-green-600 rounded-xl flex items-center justify-center"><span class="text-3xl font-black text-white italic">Glo</span></div>';
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">Glo Mobile</span>
            </div>
            
            <div className="group flex flex-col items-center gap-3">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-4 border border-gray-100">
                <img 
                  src="/assets/images/9mobilelogo.jpg" 
                  alt="9mobile" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center"><span class="text-2xl font-bold text-white">9mobile</span></div>';
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">9mobile</span>
            </div>
          </div>
          <div className="mt-16 pt-12 border-t border-gray-100">
            <p className="text-center text-sm font-semibold text-gray-600 uppercase tracking-wider mb-8">Cable TV & Utility Partners</p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              <div className="group flex flex-col items-center gap-3">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-3 border border-gray-100">
                  <img 
                    src="/assets/images/DStv.png" 
                    alt="DSTV" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="px-6 py-3 bg-gray-900 rounded-lg"><span class="text-xl font-bold text-white">DSTV</span></div>';
                    }}
                  />
                </div>
              </div>
              <div className="group flex flex-col items-center gap-3">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-3 border border-gray-100">
                  <img 
                    src="/assets/images/gotv.jpg" 
                    alt="GOtv" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="px-6 py-3 bg-blue-600 rounded-lg"><span class="text-xl font-bold text-white">GOtv</span></div>';
                    }}
                  />
                </div>
              </div>
              <div className="group flex flex-col items-center gap-3">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 p-3 border border-gray-100">
                  <img 
                    src="/assets/images/startime.png" 
                    alt="StarTimes" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="px-6 py-3 bg-red-600 rounded-lg"><span class="text-xl font-bold text-white">StarTimes</span></div>';
                    }}
                  />
                </div>
              </div>
              <div className="group flex flex-col items-center gap-3">
                <div className="px-6 py-3 bg-yellow-500 rounded-lg shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110">
                  <span className="text-xl font-bold text-gray-900">IKEDC</span>
                </div>
              </div>
              <div className="group flex flex-col items-center gap-3">
                <div className="px-6 py-3 bg-green-600 rounded-lg shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110">
                  <span className="text-xl font-bold text-white">EKEDC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4 block">Our Services</span>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Everything You Need in One Platform</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Comprehensive digital services designed to make your life easier. Experience seamless transactions with our trusted platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, idx) => (
              <div key={idx} className="bg-white p-8 border border-gray-200 shadow-sm hover:border-red-600 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="mb-6">
                  <div className={`w-16 h-16 ${service.bgColor} flex items-center justify-center mb-4 group-hover:bg-red-600 transition-all duration-300`}>
                    <service.icon className={`w-8 h-8 ${service.color} group-hover:text-white transition-colors duration-300`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors duration-300">{service.name}</h3>
                  <p className="text-gray-600 leading-relaxed">{service.desc}</p>
                </div>
                <div className="pt-4 border-t border-gray-100 group-hover:border-red-100 transition-colors duration-300">
                  <a href="#services" className="text-red-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                    Learn More
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold text-red-700">Simple Process</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                  {step.num}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold text-red-700">Why Choose Us</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose ConnectPay?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">We provide the best digital services experience in Nigeria</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="text-center p-6 rounded-xl hover:bg-gray-50 transition-all group">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-all group-hover:scale-110">
                  <feature.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


     

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4 block">Transparent Pricing</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Best Rates in Nigeria</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Enjoy competitive prices with no hidden charges</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { network: 'MTN', color: 'bg-yellow-400', textColor: 'text-gray-900', plans: [
                { data: '1GB', price: '₦280', validity: '30 Days' },
                { data: '2GB', price: '₦560', validity: '30 Days' },
                { data: '5GB', price: '₦1,400', validity: '30 Days' },
              ]},
              { network: 'Airtel', color: 'bg-red-600', textColor: 'text-white', plans: [
                { data: '1GB', price: '₦290', validity: '30 Days' },
                { data: '2GB', price: '₦580', validity: '30 Days' },
                { data: '5GB', price: '₦1,450', validity: '30 Days' },
              ]},
              { network: 'Glo', color: 'bg-green-600', textColor: 'text-white', plans: [
                { data: '1GB', price: '₦270', validity: '30 Days' },
                { data: '2GB', price: '₦540', validity: '30 Days' },
                { data: '5GB', price: '₦1,350', validity: '30 Days' },
              ]},
              { network: '9mobile', color: 'bg-emerald-500', textColor: 'text-white', plans: [
                { data: '1GB', price: '₦300', validity: '30 Days' },
                { data: '2GB', price: '₦600', validity: '30 Days' },
                { data: '5GB', price: '₦1,500', validity: '30 Days' },
              ]},
            ].map((provider, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1">
                <div className={`${provider.color} ${provider.textColor} p-6 text-center`}>
                  <h3 className="text-2xl font-bold mb-2">{provider.network}</h3>
                  <p className="text-sm opacity-90">Data Bundles</p>
                </div>
                <div className="p-6 space-y-4">
                  {provider.plans.map((plan, planIdx) => (
                    <div key={planIdx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                      <div>
                        <p className="font-bold text-gray-900">{plan.data}</p>
                        <p className="text-xs text-gray-500">{plan.validity}</p>
                      </div>
                      <p className="text-lg font-bold text-red-600">{plan.price}</p>
                    </div>
                  ))}
                  <button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105">
                    View All Plans
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { service: 'Cable TV', icon: Tv, items: [
                { name: 'DSTV Premium', price: '₦24,500/month' },
                { name: 'GOTV Max', price: '₦4,850/month' },
                { name: 'StarTimes Basic', price: '₦1,300/month' },
              ]},
              { service: 'Electricity', icon: Zap, items: [
                { name: 'IKEDC', price: 'Pay as you use' },
                { name: 'EKEDC', price: 'Pay as you use' },
                { name: 'PHED', price: 'Pay as you use' },
              ]},
              { service: 'Education', icon: GraduationCap, items: [
                { name: 'WAEC Result', price: '₦2,500' },
                { name: 'NECO Result', price: '₦1,000' },
                { name: 'JAMB e-PIN', price: '₦4,700' },
              ]},
            ].map((category, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                    <category.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{category.service}</h3>
                </div>
                <div className="space-y-3">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      <span className="text-sm font-bold text-red-600">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">Want to see full pricing details?</p>
            <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg">
              View Complete Price List
            </button>
          </div>
        </div>
      </section>


 {/* Live Statistics Counter */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600 to-red-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-white">Live Statistics</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Real-Time Platform Activity</h2>
            <p className="text-red-100">Watch our platform in action</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/20 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-4xl font-bold text-white mb-2 tabular-nums">{liveStats.activeUsers.toLocaleString()}</p>
              <p className="text-red-100 text-sm mb-3">Active Users Online</p>
              <div className="flex items-center justify-center gap-2 text-green-300 text-xs bg-white/10 py-1 px-3 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                Live Now
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/20 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <p className="text-4xl font-bold text-white mb-2 tabular-nums">{liveStats.transactionsToday.toLocaleString()}</p>
              <p className="text-red-100 text-sm mb-3">Transactions Today</p>
              <div className="flex items-center justify-center gap-2 text-green-300 text-xs bg-white/10 py-1 px-3 rounded-full">
                <span>↑ +{Math.floor(Math.random() * 20) + 10}% today</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/20 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <p className="text-4xl font-bold text-white mb-2 tabular-nums">₦{(liveStats.moneyProcessed / 1000).toFixed(1)}K</p>
              <p className="text-red-100 text-sm mb-3">Processed This Month</p>
              <div className="flex items-center justify-center gap-2 text-yellow-300 text-xs bg-white/10 py-1 px-3 rounded-full">
                <Zap className="w-3 h-3" />
                Fast & Secure
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/20 transition-all group">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <p className="text-4xl font-bold text-white mb-2 tabular-nums">{liveStats.uptime}%</p>
              <p className="text-red-100 text-sm mb-3">System Uptime</p>
              <div className="flex items-center justify-center gap-2 text-green-300 text-xs bg-white/10 py-1 px-3 rounded-full">
                <CheckCircle className="w-3 h-3" />
                All Systems Live
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/90 text-sm">
              💚 Join thousands of satisfied users making transactions every minute
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4 block">FAQ</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know about ConnectPay</p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "How quickly are transactions processed?",
                answer: "All transactions are processed instantly! Airtime and data are delivered within seconds, while cable TV and electricity payments reflect immediately in your account."
              },
              {
                question: "Is my payment information secure?",
                answer: "Absolutely! We use bank-grade 256-bit SSL encryption and are PCI DSS compliant. Your payment information is never stored on our servers and all transactions are fully encrypted."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept multiple payment methods including bank transfers, debit/credit cards (Visa, Mastercard, Verve), USSD codes, and direct wallet funding through various channels."
              },
              {
                question: "Are there any hidden charges?",
                answer: "No hidden charges whatsoever! Our transparent pricing shows all fees upfront before you complete any transaction. What you see is exactly what you pay."
              },
              {
                question: "Can I get a refund if something goes wrong?",
                answer: "Yes! If a transaction fails and you're debited, refunds are processed automatically within 24 hours. Our 24/7 support team is also available to assist with any issues."
              },
              {
                question: "Do you offer bulk purchase discounts?",
                answer: "Yes! We offer special rates for bulk purchases and resellers. Contact our sales team for custom pricing plans tailored to your business needs."
              },
              {
                question: "How do I contact customer support?",
                answer: "Our support team is available 24/7 via phone (+234 800 123 4567), email (support@connectpay.ng), and live chat on our website. We typically respond within minutes."
              },
              {
                question: "Can I integrate ConnectPay into my business?",
                answer: "Yes! We offer a robust API for businesses looking to integrate our services. Visit our API documentation section or contact our developer relations team for more information."
              }
            ].map((faq, idx) => {
              const [isOpen, setIsOpen] = useState(false);
              return (
                <div key={idx} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 hover:border-red-300 transition-all">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-100 transition-all"
                  >
                    <span className="font-bold text-gray-900 text-lg pr-4">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <button className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2 mx-auto">
              Contact Our Support Team
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Trust Badges & Certifications */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Trusted & Certified</h3>
            <p className="text-gray-600">Your security is our top priority</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[
              { icon: Shield, title: '256-bit SSL', subtitle: 'Encrypted', color: 'text-green-600', bg: 'bg-green-50' },
              { icon: CheckCircle, title: 'PCI DSS', subtitle: 'Compliant', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Shield, title: 'CAC Registered', subtitle: 'Licensed', color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: CheckCircle, title: 'Bank Verified', subtitle: 'Trusted', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: Zap, title: 'ISO 27001', subtitle: 'Certified', color: 'text-orange-600', bg: 'bg-orange-50' }
            ].map((badge, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-lg transition-all group cursor-pointer">
                <div className={`w-16 h-16 ${badge.bg} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <badge.icon className={`w-8 h-8 ${badge.color}`} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{badge.title}</h4>
                <p className="text-sm text-gray-500">{badge.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* API/Developer Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <span className="text-sm font-semibold">For Developers</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">Powerful API for Your Business</h2>
              <p className="text-xl text-gray-300 leading-relaxed">
                Integrate ConnectPay services into your application with our easy-to-use RESTful API. 
                Start processing transactions in minutes with comprehensive documentation and 24/7 developer support.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Zap, text: 'Fast & Reliable - 99.9% uptime guarantee' },
                  { icon: Shield, text: 'Secure Authentication - OAuth 2.0 & API keys' },
                  { icon: CheckCircle, text: 'Well Documented - Clear examples & guides' },
                  { icon: Users, text: 'Developer Support - Dedicated technical team' }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-gray-200">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                  View API Docs
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="border-2 border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-lg font-semibold transition-all">
                  Get API Key
                </button>
              </div>
            </div>

            <div className="bg-gray-950 rounded-2xl p-6 shadow-2xl border border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">API Example</span>
              </div>
              <pre className="text-sm text-green-400 overflow-x-auto">
{`{
  "endpoint": "/api/v1/data/purchase",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "network": "mtn",
    "phone": "08012345678",
    "plan": "1GB",
    "amount": 280
  },
  "response": {
    "status": "success",
    "message": "Transaction completed",
    "transaction_id": "TXN123456789",
    "balance": 24720
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Download Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-full mb-6">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Mobile App</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                  Pay Bills on the Go with Our Mobile App
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed mb-8">
                  Download the ConnectPay mobile app and enjoy seamless transactions, instant notifications, and exclusive mobile-only deals right at your fingertips.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Lightning Fast</h3>
                  <p className="text-sm text-gray-600">Complete transactions in seconds with optimized performance</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Secure Login</h3>
                  <p className="text-sm text-gray-600">Biometric authentication with Face ID & fingerprint</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Offline Mode</h3>
                  <p className="text-sm text-gray-600">View history and prepare transactions offline</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Smart Alerts</h3>
                  <p className="text-sm text-gray-600">Instant push notifications for all transactions</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="#" className="group bg-black hover:bg-gray-900 text-white rounded-2xl transition-all flex items-center gap-4 p-4 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-80 mb-1">Download on the</div>
                    <div className="text-xl font-bold leading-tight">App Store</div>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
                </a>

                <a href="#" className="group bg-black hover:bg-gray-900 text-white rounded-2xl transition-all flex items-center gap-4 p-4 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-80 mb-1">GET IT ON</div>
                    <div className="text-xl font-bold leading-tight">Google Play</div>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              <div className="flex items-center gap-8 pt-4 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">4.8 rating on app stores</p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">50K+</p>
                  <p className="text-sm text-gray-600">Active downloads</p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">24/7</p>
                  <p className="text-sm text-gray-600">Available support</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-200 to-orange-200 rounded-3xl blur-3xl opacity-30"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl">
                  <div className="bg-white rounded-2xl p-8">
                    <div className="flex items-center justify-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-3xl flex items-center justify-center shadow-xl">
                        <Smartphone className="w-10 h-10 text-white" />
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">ConnectPay Mobile</h3>
                    <p className="text-center text-gray-600 mb-8">Your Digital Wallet Companion</p>

                    <div className="space-y-4">
                      {[
                        { icon: Smartphone, text: 'Quick bill payments', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { icon: CreditCard, text: 'Secure transactions', color: 'text-green-600', bg: 'bg-green-50' },
                        { icon: BarChart3, text: 'Transaction analytics', color: 'text-purple-600', bg: 'bg-purple-50' },
                        { icon: Users, text: 'Manage beneficiaries', color: 'text-orange-600', bg: 'bg-orange-50' },
                        { icon: Clock, text: 'Schedule payments', color: 'text-red-600', bg: 'bg-red-50' },
                        { icon: Shield, text: 'Biometric security', color: 'text-indigo-600', bg: 'bg-indigo-50' }
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all group cursor-pointer">
                          <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <feature.icon className={`w-6 h-6 ${feature.color}`} />
                          </div>
                          <span className="font-medium text-gray-900">{feature.text}</span>
                          <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-4">Scan QR Code to Download</p>
                        <div className="inline-block bg-gray-900 p-4 rounded-2xl">
                          <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center">
                            <div className="grid grid-cols-8 gap-1">
                              {Array.from({ length: 64 }).map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 ${Math.random() > 0.5 ? 'bg-gray-900' : 'bg-white'}`}></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-2xl p-6 hidden lg:block">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">100K+</p>
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-xs text-green-600 font-medium">This week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* Newsletter Signup */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Stay Updated with ConnectPay</h2>
              <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
                Subscribe to our newsletter and get exclusive deals, updates, and special offers delivered to your inbox.
              </p>
              
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex-1 px-6 py-4 rounded-xl focus:outline-none text-gray-900 placeholder-gray-400"
                  />
                  <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 whitespace-nowrap">
                    Subscribe Now
                  </button>
                </div>
                <p className="text-sm text-red-100 mt-4">
                  🎁 Get ₦100 bonus on your first transaction after subscribing!
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Exclusive deals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">No spam, ever</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Unsubscribe anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-600 to-red-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-red-100 mb-8">Join thousands of satisfied customers using ConnectPay for their daily transactions</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-white hover:bg-gray-100 text-red-600 px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105 shadow-xl flex items-center gap-2">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-8 py-4 rounded-xl font-semibold text-lg transition transform hover:scale-105">Contact Sales</button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-8 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">ConnectPay</span>
              </div>
              <p className="text-gray-400 mb-4">Your trusted partner for digital services across Nigeria.</p>
              <div className="flex gap-3">
                {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 bg-gray-800 hover:bg-red-600 rounded-lg flex items-center justify-center transition-all">
                    <span className="text-white text-xs">{social[0].toUpperCase()}</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-3">
                {['Airtime Top-up', 'Data Bundles', 'Cable TV', 'Electricity', 'Education', 'Internet'].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-red-500 transition">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'How It Works', 'Pricing', 'Contact Us', 'Blog', 'Careers'].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-red-500 transition">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-red-500 mt-0.5" />
                  <span>+234 800 123 4567</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-red-500 mt-0.5" />
                  <span>support@connectpay.ng</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                  <span>Lagos, Nigeria</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-center md:text-left">&copy; 2024 ConnectPay. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-red-500 transition">Privacy Policy</a>
              <a href="#" className="hover:text-red-500 transition">Terms of Service</a>
              <a href="#" className="hover:text-red-500 transition">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}