'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, X, ChevronDown, ArrowRight, Wifi, Tv, Zap, Printer, Globe, GraduationCap, DollarSign, Phone, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Service configuration - moved outside component for performance
const SERVICES_CONFIG = [
  { 
    icon: Wifi, 
    name: 'Data Bundles', 
    desc: 'Affordable data plans', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
  { 
    icon: Tv, 
    name: 'Cable TV', 
    desc: 'DSTV, GOTV subscriptions', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
  { 
    icon: Zap, 
    name: 'Electricity', 
    desc: 'Pay electricity bills', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
  { 
    icon: Printer, 
    name: 'Print Recharge', 
    desc: 'Generate recharge pins', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
  { 
    icon: Globe, 
    name: 'Internet', 
    desc: 'Internet subscriptions', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
  { 
    icon: GraduationCap, 
    name: 'Education', 
    desc: 'WAEC, NECO, JAMB', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
  { 
    icon: DollarSign, 
    name: 'Betting & Transfer', 
    desc: 'Fund wallets & transfers', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    href: '#services'
  },
];

const CONTACT_INFO = {
  phone: '+234 800 123 4567',
  email: 'support@connectpay.ng'
};

const NAV_LINKS = [
  { href: '/', label: 'Home', isRoute: true },
  { href: '#how-it-works', label: 'How it works', isRoute: false },
  { href: '#features', label: 'Why us', isRoute: false },
  { href: '#pricing', label: 'Pricing', isRoute: false },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [headerBg, setHeaderBg] = useState(false);
  const pathname = usePathname();

  // Optimized scroll handler with debouncing
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setHeaderBg(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setServicesOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Memoized callbacks
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
    setServicesOpen(false);
  }, []);

  const toggleServices = useCallback(() => {
    setServicesOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setServicesOpen(false);
  }, []);

  // Memoized class names
  const headerClassName = useMemo(() => 
    `fixed top-0 w-full z-40 transition-all duration-300 ${
      headerBg ? 'bg-white shadow-lg border-b border-gray-100' : 'bg-white shadow-sm'
    }`,
    [headerBg]
  );

  return (
    <header className={headerClassName}>
      {/* Top Bar */}
      <TopBar />

      {/* Main Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="navigation" aria-label="Main navigation">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <DesktopNav pathname={pathname} />

          {/* Desktop CTA Buttons */}
          <DesktopCTA />

          {/* Mobile Menu Button */}
          <MobileMenuButton 
            isOpen={mobileMenuOpen} 
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu 
          isOpen={mobileMenuOpen}
          servicesOpen={servicesOpen}
          toggleServices={toggleServices}
          closeMenu={closeMobileMenu}
          pathname={pathname}
        />
      </nav>
    </header>
  );
}

// ============================================================================
// Sub-components for better organization and reusability
// ============================================================================

function TopBar() {
  return (
    <div className="bg-red-600 text-white py-1.5 px-4 sm:px-6 lg:px-8 text-[10px] sm:text-xs h-[32px] sm:h-[36px] flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
          <ContactInfo icon={Phone} text={CONTACT_INFO.phone} />
          <ContactInfo icon={Mail} text={CONTACT_INFO.email} />
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function ContactInfo({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90 flex-shrink-0" aria-hidden="true" />
      <span className="text-white font-medium">{text}</span>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3">
      <Link href="/" className="flex items-center space-x-2 sm:space-x-3" aria-label="ConnectPay Home">
        <Image 
          src="/assets/images/logo.png" 
          alt="ConnectPay Logo" 
          width={50} 
          height={50}
          className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
          priority
        />
        <div className="flex flex-col">
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent uppercase">
            CONNECTPAY
          </span>
          <p className="text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:block uppercase">
            Digital Services
          </p>
        </div>
      </Link>
    </div>
  );
}

function DesktopNav({ pathname }) {
  return (
    <div className="hidden lg:flex items-center justify-center flex-1">
      <div className="flex items-center space-x-0 lg:space-x-1 xl:space-x-0">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return link.isRoute ? (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 xl:px-4 py-2 font-medium transition rounded-lg text-sm tracking-wide ${
                isActive 
                  ? 'text-red-600 bg-red-50' 
                  : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.href}
              href={link.href}
              className="px-3 xl:px-4 py-2 font-medium text-gray-700 hover:text-red-600 transition rounded-lg hover:bg-red-50 text-sm tracking-wide"
            >
              {link.label}
            </a>
          );
        })}
        
        {/* Services Dropdown */}
        <ServicesDropdown />
        
        {/* Contact Us - Last item */}
        <a
          href="#contact"
          className="px-3 xl:px-4 py-2 font-medium text-gray-700 hover:text-red-600 transition rounded-lg hover:bg-red-50 text-sm tracking-wide"
        >
          Contact us
        </a>
      </div>
    </div>
  );
}

function ServicesDropdown() {
  return (
    <div className="relative group">
      <button 
        className="flex items-center gap-1 px-3 xl:px-4 py-2 font-medium text-gray-700 hover:text-red-600 transition rounded-lg hover:bg-red-50 text-sm tracking-wide"
        aria-haspopup="true"
        aria-expanded="false"
      >
        Services
        <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" aria-hidden="true" />
      </button>
      
      <div className="absolute top-full left-0 mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-900 tracking-wide mb-1">
              Our services
            </h3>
            <p className="text-xs text-gray-500">All digital solutions</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {SERVICES_CONFIG.map((service) => (
              <ServiceItem key={service.name} service={service} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceItem({ service }) {
  const Icon = service.icon;
  
  return (
    <a
      href={service.href}
      className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-all group/item"
    >
      <div className={`w-9 h-9 ${service.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${service.color}`} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate block">
          {service.name}
        </span>
        <span className="text-xs text-gray-500 truncate block">
          {service.desc}
        </span>
      </div>
    </a>
  );
}

function DesktopCTA() {
  return (
    <div className="hidden lg:flex items-center space-x-2">
      <Link 
        href="/login" 
        className="font-medium text-gray-700 hover:text-red-600 px-3 py-2 rounded-lg transition hover:bg-gray-50 text-sm tracking-wide"
      >
        Sign in
      </Link>
      <Link 
        href="/register" 
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition transform hover:scale-[1.02] shadow-md flex items-center gap-1.5 text-sm tracking-wide"
      >
        Get started
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function MobileMenuButton({ isOpen, onClick }) {
  return (
    <button 
      className="lg:hidden text-gray-700 p-1.5 hover:bg-gray-100 rounded-lg transition" 
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}

function MobileMenu({ isOpen, servicesOpen, toggleServices, closeMenu, pathname }) {
  if (!isOpen) return null;

  return (
    <div 
      id="mobile-menu"
      className="lg:hidden border-t border-gray-100 py-3 space-y-0.5"
      role="menu"
    >
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return link.isRoute ? (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMenu}
            className={`block px-4 py-2.5 font-medium transition rounded-lg text-sm ${
              isActive 
                ? 'text-red-600 bg-red-50' 
                : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
            }`}
            role="menuitem"
          >
            {link.label}
          </Link>
        ) : (
          <a
            key={link.href}
            href={link.href}
            onClick={closeMenu}
            className="block px-4 py-2.5 font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
            role="menuitem"
          >
            {link.label}
          </a>
        );
      })}

      {/* Mobile Services Dropdown */}
      <div>
        <button 
          onClick={toggleServices}
          className="flex items-center justify-between w-full px-4 py-2.5 font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
          aria-expanded={servicesOpen}
        >
          Services
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        
        {servicesOpen && (
          <div className="pl-4 mt-1 space-y-0.5">
            {SERVICES_CONFIG.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.name}
                  href={service.href}
                  onClick={closeMenu}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                >
                  <Icon className={`w-4 h-4 ${service.color}`} aria-hidden="true" />
                  {service.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Us - Last item before CTA */}
      <a
        href="#contact"
        onClick={closeMenu}
        className="block px-4 py-2.5 font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
        role="menuitem"
      >
        Contact us
      </a>

      {/* Mobile CTA Buttons */}
      <div className="pt-3 space-y-2 border-t border-gray-100 mt-3">
        <Link 
          href="/login"
          onClick={closeMenu}
          className="block w-full text-center font-medium text-gray-700 hover:text-red-600 py-2.5 border border-gray-200 hover:border-red-600 rounded-lg transition text-sm uppercase"
        >
          Sign in
        </Link>
        <Link 
          href="/register"
          onClick={closeMenu}
          className="block w-full text-center bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium shadow-md transition text-sm uppercase"
        >
          Get started free
        </Link>
      </div>
    </div>
  );
}