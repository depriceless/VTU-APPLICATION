'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, X, ChevronDown, ArrowRight, Wifi, Tv, Zap, Printer, Globe, GraduationCap, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SERVICES_CONFIG = [
  { icon: Wifi,          name: 'Data Bundles',      desc: 'Affordable data plans',       href: '#services' },
  { icon: Tv,            name: 'Cable TV',           desc: 'DSTV, GOTV subscriptions',    href: '#services' },
  { icon: Zap,           name: 'Electricity',        desc: 'Pay electricity bills',        href: '#services' },
  { icon: Printer,       name: 'Print Recharge',     desc: 'Generate recharge pins',       href: '#services' },
  { icon: Globe,         name: 'Internet',           desc: 'Internet subscriptions',       href: '#services' },
  { icon: GraduationCap, name: 'Education',          desc: 'WAEC, NECO, JAMB',            href: '#services' },
  { icon: DollarSign,    name: 'Betting & Transfer', desc: 'Fund wallets & transfers',     href: '#services' },
];

const NAV_LINKS = [
  { href: '/',             label: 'Home',         isRoute: true  },
  { href: '#how-it-works', label: 'How it works', isRoute: false },
  { href: '#features',     label: 'Why us',       isRoute: false },
  { href: '#pricing',      label: 'Pricing',      isRoute: false },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen]     = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { setScrolled(window.scrollY > 20); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMobileMenuOpen(false); setServicesOpen(false); } };
    if (mobileMenuOpen) { document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const toggleMobile   = useCallback(() => { setMobileMenuOpen(p => !p); setServicesOpen(false); }, []);
  const toggleServices = useCallback(() => setServicesOpen(p => !p), []);
  const closeMenu      = useCallback(() => { setMobileMenuOpen(false); setServicesOpen(false); }, []);

  const headerClass = useMemo(() =>
    `fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)] border-b border-gray-100/80'
        : 'bg-white border-b border-gray-300'
    }`,
    [scrolled]
  );

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .header-font { font-family: 'Plus Jakarta Sans', sans-serif; }
        .nav-link-underline { position: relative; }
        .nav-link-underline::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          width: 0;
          height: 2px;
          background: #dc2626;
          border-radius: 2px;
          transition: all 0.25s ease;
          transform: translateX(-50%);
        }
        .nav-link-underline:hover::after,
        .nav-link-underline.active::after { width: 70%; }
        .services-panel {
          transform: translateY(8px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .services-trigger:hover .services-panel,
        .services-trigger:focus-within .services-panel {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }
        .service-card { transition: background 0.15s ease, transform 0.15s ease; }
        .service-card:hover { background: #fef2f2; transform: translateX(2px); }
      `}</style>

      <header className={`${headerClass} header-font`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16 sm:h-[68px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0" aria-label="ConnectPay Home">
              <div className="relative">
                <Image
                  src="/assets/images/logo.png"
                  alt="ConnectPay Logo"
                  width={52}
                  height={52}
                  className="h-11 w-11 sm:h-12 sm:w-12 object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[17px] sm:text-[18px] font-bold text-gray-900 tracking-tight">
                  Connect<span className="text-red-600">Pay</span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium tracking-[0.08em] uppercase hidden sm:block mt-0.5">
                  Digital Services
                </span>
              </div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link-underline px-4 py-2 text-[13.5px] font-semibold tracking-wide rounded-lg transition-colors ${
                      pathname === link.href ? 'text-red-600 active' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="nav-link-underline px-4 py-2 text-[13.5px] font-semibold tracking-wide text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                  >
                    {link.label}
                  </a>
                )
              )}

              {/* Services mega dropdown */}
              <div className="services-trigger relative">
                <button
                  className="nav-link-underline flex items-center gap-1 px-4 py-2 text-[13.5px] font-semibold tracking-wide text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                  aria-haspopup="true"
                >
                  Services
                  <ChevronDown className="w-3.5 h-3.5 mt-0.5" />
                </button>

                <div className="services-panel absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[520px] bg-white rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">All Services</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Fast, reliable digital solutions</p>
                    </div>
                    <a href="#services" className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors">
                      View all <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SERVICES_CONFIG.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a key={s.name} href={s.href} className="service-card flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-800 leading-tight">{s.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{s.desc}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Link
                href="/contact"
                className={`nav-link-underline px-4 py-2 text-[13.5px] font-semibold tracking-wide rounded-lg transition-colors ${
                  pathname === '/contact' ? 'text-red-600 active' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Contact
              </Link>
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-[13.5px] font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors tracking-wide"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-[13.5px] font-bold shadow-lg shadow-red-600/30 hover:shadow-red-600/40 transition-all duration-200 tracking-wide"
              >
                Get started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={toggleMobile}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* ── Mobile menu ── */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 py-4 space-y-1 pb-6">
              {NAV_LINKS.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                      pathname === link.href ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="flex items-center px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    {link.label}
                  </a>
                )
              )}

              {/* Mobile services accordion */}
              <div>
                <button
                  onClick={toggleServices}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  aria-expanded={servicesOpen}
                >
                  Services
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`} />
                </button>
                {servicesOpen && (
                  <div className="mt-1 ml-2 space-y-0.5 border-l-2 border-red-100 pl-3">
                    {SERVICES_CONFIG.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a
                          key={s.name}
                          href={s.href}
                          onClick={closeMenu}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-red-50 group-hover:bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                            <Icon className="w-3.5 h-3.5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-800">{s.name}</p>
                            <p className="text-[11px] text-gray-400">{s.desc}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <Link
                href="/contact"
                onClick={closeMenu}
                className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  pathname === '/contact' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Contact
              </Link>

              {/* Mobile CTA row */}
              <div className="pt-4 space-y-2.5 border-t border-gray-100 mt-3 px-1">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center w-full py-3 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/25 transition-colors"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}