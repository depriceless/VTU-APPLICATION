'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ChevronDown, Shield, Zap, HeadphonesIcon,
  TrendingUp, Star, ArrowUpRight,
} from 'lucide-react';
import {
  FaMobileAlt, FaWifi, FaTv, FaBolt,
  FaPrint, FaGlobe, FaGraduationCap, FaMoneyBillWave,
} from 'react-icons/fa';
import Header from '@/components/Header/page';
import Footer from '@/components/Footer/page';
import apiClient from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DataPlan {
  id: string;
  planId: string;
  name: string;
  customerPrice: number;
  dataSize: string;
  validity: string;
  type: 'regular' | 'sme' | 'gift' | 'cg';
}

// ── Static data ───────────────────────────────────────────────────────────────
const SERVICES = [
  { icon: FaMobileAlt,     name: 'Airtime Top-Up',  desc: 'Instant top-up for all networks, any time of day.',     badge: 'Save ₦50',       link: '/services/airtime',        dashboardLink: '/dashboard/airtime' },
  { icon: FaWifi,          name: 'Data Bundles',     desc: 'Up to 30% cheaper than buying directly from carriers.', badge: 'Save 30%',       link: '/services/data',           dashboardLink: '/dashboard/data' },
  { icon: FaTv,            name: 'Cable TV',         desc: 'DSTV, GOTV, Startimes renewals — instant activation.',  badge: '24 / 7',         link: '/services/cabletv',        dashboardLink: '/dashboard/cabletv' },
  { icon: FaBolt,          name: 'Electricity',      desc: 'Buy power tokens in seconds, delivered to your meter.', badge: 'Instant',        link: '/services/electricity',    dashboardLink: '/dashboard/electricity' },
  { icon: FaPrint,         name: 'Print Recharge',   desc: 'Generate recharge pins in bulk — zero capital needed.', badge: 'Bulk Deals',     link: '/services/print-recharge', dashboardLink: '/dashboard/print-recharge' },
  { icon: FaGlobe,         name: 'Internet',         desc: 'Spectranet, Smile & more — never lose connection.',     badge: 'Best Rates',     link: '/services/internet',       dashboardLink: '/dashboard/internet' },
  { icon: FaGraduationCap, name: 'Education',        desc: 'WAEC, NECO, JAMB pins emailed the moment you pay.',     badge: 'Email Delivery', link: '/services/education',      dashboardLink: '/dashboard/education' },
  { icon: FaMoneyBillWave, name: 'Betting Wallet',   desc: 'Fund Bet9ja, 1xBet instantly — zero failed deposits.',  badge: '0% Fee',         link: '/services/betting',        dashboardLink: '/dashboard/betting' },
];

// Static fallback prices (shown to logged-out visitors)
const STATIC_NETWORKS = [
  { id: 'mtn',     name: 'MTN',     logo: '/assets/images/mtnlogo.jpg',     plans: [{ size: '500MB', price: '135' }, { size: '1GB', price: '270', popular: true }, { size: '2GB', price: '540' }, { size: '5GB', price: '1,350' }] },
  { id: 'airtel',  name: 'Airtel',  logo: '/assets/images/Airtelogo.png',   plans: [{ size: '500MB', price: '140' }, { size: '1GB', price: '280', popular: true }, { size: '2GB', price: '560' }, { size: '5GB', price: '1,400' }] },
  { id: 'glo',     name: 'Glo',     logo: '/assets/images/glologo.png',     plans: [{ size: '500MB', price: '125' }, { size: '1GB', price: '250', popular: true }, { size: '2GB', price: '500' }, { size: '5GB', price: '1,250' }] },
  { id: '9mobile', name: '9mobile', logo: '/assets/images/9mobilelogo.jpg', plans: [{ size: '500MB', price: '130' }, { size: '1GB', price: '260', popular: true }, { size: '2GB', price: '520' }, { size: '5GB', price: '1,300' }] },
];

/** Format a price number the same way the data page does */
const fmt = (n: number) => n.toLocaleString('en-US');

const FAQS = [
  { q: 'How quickly will I receive my airtime or data?',  a: 'Delivery completes in under 10 seconds on 99.9% of transactions. If we miss that window, we refund you double — automatically, no questions asked.' },
  { q: 'What if my transaction fails but I was debited?', a: 'You are automatically refunded within 5 minutes plus a N50 inconvenience credit. Our 24/7 support team is always available if you need extra help.' },
  { q: 'Is my money safe on ConnectPay?',                 a: 'We use 256-bit SSL encryption and are PCI DSS compliant. Over N2.8 billion processed with a 99.9% success rate. Your funds are fully secured.' },
  { q: 'Do I need to verify before I can buy?',           a: 'No. Start purchasing the moment you register. Verification is only required for transactions above N50,000 per day.' },
  { q: 'Which payment methods do you support?',           a: 'Bank transfers, Debit/Credit cards (Visa, Mastercard, Verve), USSD, and direct wallet funding are all supported.' },
  { q: 'Are there hidden fees?',                          a: 'None. Every fee is shown before you confirm. What you see is exactly what you pay.' },
  { q: 'Can I get a bulk purchase discount?',             a: 'Yes. Resellers and bulk buyers enjoy custom rates that can save up to 40%. Contact our sales team for a tailored quote.' },
];

const TESTIMONIALS = [
  { name: 'Adebayo Oluwaseun', location: 'Lagos',         initials: 'AO', color: 'from-rose-500 to-orange-400',  text: 'Data arrives in under 10 seconds every single time. I have never experienced a failed transaction in 8 months of using ConnectPay.' },
  { name: 'Chioma Nnamdi',     location: 'Abuja',         initials: 'CN', color: 'from-blue-500 to-violet-500',  text: 'I renew my DSTV at odd hours and it activates instantly. The support team is also incredibly fast whenever I have questions.' },
  { name: 'Emeka Okonkwo',     location: 'Port Harcourt', initials: 'EO', color: 'from-emerald-500 to-teal-400', text: 'Running a recharge card business with ConnectPay is seamless. Bulk pins generated in seconds, and the rates beat every competitor.' },
  { name: 'Fatima Bello',      location: 'Kano',          initials: 'FB', color: 'from-amber-500 to-yellow-400', text: 'I fund my betting wallet here because deposits never fail. Other platforms waste my time — ConnectPay just works.' },
  { name: 'Tunde Adeyemi',     location: 'Ibadan',        initials: 'TA', color: 'from-pink-500 to-rose-400',    text: 'Switched from buying airtime at the roadside. ConnectPay saves me money every month and is available at 3am without fail.' },
  { name: 'Ngozi Eze',         location: 'Enugu',         initials: 'NE', color: 'from-indigo-500 to-blue-400',  text: 'Got my WAEC result checker pin in my email within a minute of paying. Highly recommend for students and parents alike.' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [faqOpen, setFaqOpen]       = useState<Record<number, boolean>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  // Fetched plans keyed by network id
  const [fetchedPlans, setFetchedPlans] = useState<Record<string, DataPlan[]>>({});
  const [plansLoading, setPlansLoading] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Fonts ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap';
    document.head.appendChild(link);
  }, []);

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, []);

  // ── Fetch live plans for all visitors ─────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setPlansLoading(true);
      const networks = ['mtn', 'airtel', 'glo', '9mobile'];
      const results: Record<string, DataPlan[]> = {};

      await Promise.allSettled(
        networks.map(async (network) => {
          try {
            const endpoint = isLoggedIn
              ? `/easyaccess/plans/${network}?t=${Date.now()}`
              : `/easyaccess/plans/public/${network}?t=${Date.now()}`;
            const response = await apiClient.get(endpoint);
            if (response.data?.success && Array.isArray(response.data.plans)) {
              const mapped = response.data.plans.map((plan: any) => ({
                id:            plan.id     != null ? String(plan.id)     : String(plan.planId),
                planId:        plan.planId != null ? String(plan.planId) : String(plan.id),
                name:          plan.name          ?? 'Unknown Plan',
                dataSize:      plan.dataSize       ?? '',
                customerPrice: plan.customerPrice  != null ? Number(plan.customerPrice) : 0,
                validity:      plan.validity       ?? '',
                type:          (plan.type as DataPlan['type']) ?? 'regular',
              }));
              results[network] = mapped;
            } else {
            }
          } catch (err) {
          }
        })
      );

      setFetchedPlans(results);
      setPlansLoading(false);
    };

    fetchAll();
  }, [isLoggedIn]);

  // ── Build the pricing grid ─────────────────────────────────────────────────
  const pricingNetworks = useMemo(() => {
    return STATIC_NETWORKS.map((net) => {
      const livePlans = fetchedPlans[net.id];
      if (!livePlans || livePlans.length === 0) return net;

      const preferred = [
        ...livePlans.filter(p => p.type === 'cg'),
        ...livePlans.filter(p => p.type === 'regular'),
        ...livePlans.filter(p => p.type !== 'cg' && p.type !== 'regular'),
      ];
      const top4 = preferred.slice(0, 4);

      const plans = top4.map((p, i) => ({
        size:    p.dataSize || p.name,
        price:   fmt(p.customerPrice),
        popular: i === 1,
        validity: p.validity,
      }));

      return { ...net, plans };
    });
  }, [fetchedPlans]);

  // ── Intersection observer for service cards ────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = parseInt((entry.target as HTMLElement).dataset.index || '0');
            setVisibleCards((prev) => (prev.includes(i) ? prev : [...prev, i]));
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    cardRefs.current.forEach((r) => r && observer.observe(r));
    return () => observer.disconnect();
  }, []);

  const toggleFaq = (i: number) => setFaqOpen((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
        .cp-hero-font, .cp-hero-font * { font-family: 'Roboto', sans-serif !important; }
        .cp-root { font-family: 'DM Sans', system-ui, sans-serif; background: #ffffff; color: #111827; --red:#dc2626; --red-dk:#b91c1c; --red-lt:#fef2f2; --gray-50:#f9fafb; --gray-100:#f3f4f6; --gray-200:#e5e7eb; --gray-500:#6b7280; --gray-700:#374151; --gray-900:#111827; }
        .cp-display { font-family: 'Syne', sans-serif; }
        .cp-btn-red { background: var(--red); transition: background .2s ease, box-shadow .25s ease, transform .2s ease; color: #fff; }
        .cp-btn-red:hover { background: var(--red-dk); box-shadow: 0 8px 24px rgba(220,38,38,.35); transform: translateY(-1px); }
        .cp-service { background: #ffffff; border: 2px solid var(--gray-200); transition: border-color .3s, transform .3s, box-shadow .3s; }
        .cp-service:hover { border-color: var(--red); transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,.1); }
        .cp-svc-icon { transition: background .3s, color .3s; }
        .cp-service:hover .cp-svc-icon { background: var(--red) !important; color: #fff !important; }
        .cp-price { background: #ffffff; border: 2px solid var(--gray-200); transition: border-color .3s, box-shadow .3s; }
        .cp-price:hover { border-color: var(--red); box-shadow: 0 12px 32px rgba(0,0,0,.08); }
        .cp-why { background: #ffffff; border: 2px solid var(--gray-200); transition: border-color .3s, transform .3s, box-shadow .3s; }
        .cp-why:hover { border-color: var(--red); transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,.08); }
        .cp-faq { background: var(--gray-50); transition: border-color .25s; }
        .cp-faq-body { max-height: 0; overflow: hidden; transition: max-height .35s ease; }
        .cp-faq-body.open { max-height: 260px; }
        .cp-fade { opacity: 0; transform: translateY(24px); transition: opacity .55s ease, transform .55s ease; }
        .cp-fade.in { opacity: 1; transform: translateY(0); }
        .cp-marquee { overflow: hidden; }
        .cp-track { display: flex; gap: 1.25rem; width: max-content; animation: cpscroll 48s linear infinite; }
        .cp-track:hover { animation-play-state: paused; }
        @keyframes cpscroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .cp-hero-title { font-family: 'Roboto', sans-serif !important; }
        .cp-hero-overlay { background: rgba(0,0,0,0.70); }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
        .cp-hero-animate { animation: slideInLeft 0.75s ease forwards; }
        .cp-hero-animate-delay { opacity: 0; animation: slideInLeft 0.75s ease 0.2s forwards; }
        .cp-hero-animate-delay2 { opacity: 0; animation: slideInLeft 0.75s ease 0.4s forwards; }
        .cp-hero-btns a { width: auto !important; white-space: nowrap !important; }
        .cp-price-skeleton { display: inline-block; width: 48px; height: 16px; border-radius: 4px; background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; vertical-align: middle; }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @media (max-width: 640px) {
          .cp-hero-section { min-height: 75svh !important; }
          .cp-hero-inner { padding-top: 4.5rem !important; padding-bottom: 2.5rem !important; text-align: center !important; align-items: center !important; }
          .cp-hero-inner, .cp-hero-inner * { font-family: 'Roboto', sans-serif !important; }
          .cp-hero-title { font-size: 1.6rem !important; line-height: 1.15 !important; margin-bottom: 1rem !important; }
          .cp-hero-subtitle { font-size: 1rem !important; margin-bottom: 1.5rem !important; }
          .cp-hero-btns { flex-direction: column !important; align-items: center !important; gap: 0.6rem !important; }
          .cp-hero-btns a { padding: 0.8rem 1.5rem !important; font-size: 0.82rem !important; border-radius: 8px !important; }
        }
      `}</style>

      <div className="cp-root">
        <div className="cp-btn-red py-2 px-4 text-center text-xs font-semibold tracking-wide">
          🔥&nbsp; Register now — receive <strong>₦100 free credit</strong> and <strong>30% off</strong> your first data purchase
        </div>

        <Header />

        {/* HERO */}
        <section className="cp-hero-section relative flex flex-col justify-center overflow-hidden" style={{ minHeight: '100svh' }}>
          <div className="absolute inset-0">
            <img src="/assets/images/heroimg.jpg" alt="" className="w-full h-full object-cover object-center" />
            <div className="cp-hero-overlay absolute inset-0" />
          </div>
          <div className="cp-hero-font relative z-10 w-full flex flex-col items-center justify-center text-center cp-hero-inner"
               style={{ paddingTop: '7rem', paddingBottom: '5rem', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
            <h1 className="cp-hero-title cp-hero-animate font-bold text-white mb-5"
                style={{ fontFamily: "'Roboto', sans-serif", fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', lineHeight: 1.15, maxWidth: '700px' }}>
              Nigeria's #1 Platform for{' '}
              <span style={{ color: '#f87171' }}>Instant Digital Payments</span>
            </h1>
            <p className="cp-hero-subtitle cp-hero-animate-delay mb-8"
               style={{ fontFamily: "'Roboto', sans-serif", fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.85)', maxWidth: '480px', lineHeight: 1.7 }}>
              Top up Airtime, buy Data, pay Electricity Bills, renew TV Subscriptions and get Exam Pins — all in under 10 seconds.
            </p>
            <div className="cp-hero-btns cp-hero-animate-delay2 flex gap-4 justify-center">
              <Link href="/auth" className="cp-btn-red font-bold inline-flex items-center gap-2"
                    style={{ fontFamily: "'Roboto', sans-serif", padding: '0.9rem 2rem', fontSize: '0.95rem', borderRadius: '8px' }}>
                Get Started Free
              </Link>
              <Link href="#services" className="font-bold transition-all inline-flex items-center gap-2"
                    style={{ fontFamily: "'Roboto', sans-serif", padding: '0.9rem 2rem', fontSize: '0.95rem', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.6)', color: '#fff', background: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = '#fff'; }}>
                Explore Services
              </Link>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="py-24 px-6 lg:px-12" style={{ background: 'linear-gradient(to bottom, #ffffff, #f9fafb)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="mb-14">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-4">What We Offer</span>
              <h2 className="cp-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Everything in One Platform</h2>
              <p className="text-base text-gray-500" style={{ maxWidth: '500px' }}>Eight essential services — all instant, all cheaper than anywhere else.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SERVICES.map((s, idx) => {
                const visible = visibleCards.includes(idx);
                return (
                  <div key={idx} ref={(el) => (cardRefs.current[idx] = el)} data-index={idx}
                       className={`cp-fade ${visible ? 'in' : ''}`} style={{ transitionDelay: `${(idx % 4) * 75}ms` }}>
                    <Link href={isLoggedIn ? s.dashboardLink : '/auth'} className="cp-service rounded-2xl p-6 flex flex-col gap-4 h-full block">
                      <div className="cp-svc-icon w-12 h-12 rounded-xl flex items-center justify-center text-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
                        <s.icon />
                      </div>
                      <span className="self-start text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>{s.badge}</span>
                      <div className="flex-1">
                        <h3 className="cp-display text-base font-bold text-gray-900 mb-1.5">{s.name}</h3>
                        <p className="text-sm leading-relaxed text-gray-500">{s.desc}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-red-600">
                        Buy Now <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 px-6 lg:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-14">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-4">Transparent Pricing</span>
              <h2 className="cp-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Data Plans — All Networks</h2>
              <p className="text-base text-gray-500" style={{ maxWidth: '480px' }}>No hidden fees. No surprises. Rates you won't find cheaper elsewhere.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {pricingNetworks.map((net) => (
                <div key={net.id} className="cp-price rounded-2xl overflow-hidden">
                  <div className="p-5 bg-gray-50" style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
                        <img src={net.logo} alt={net.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>Save 30%</span>
                    </div>
                    <p className="cp-display font-bold text-gray-900">{net.name} Data</p>
                    <p className="text-xs text-gray-500">30-day bundles</p>
                  </div>

                  <div className="p-5 space-y-2">
                    {net.plans.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                           style={{ background: p.popular ? '#fef2f2' : 'transparent', border: p.popular ? '1px solid #fecaca' : '1px solid transparent' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{p.size}</span>
                          {p.popular && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ background: '#dc2626' }}>Hot</span>}
                        </div>
                        {plansLoading
                          ? <span className="cp-price-skeleton" />
                          : <span className="cp-display text-base font-bold text-gray-900">
                              {p.price !== '—' ? `₦${p.price}` : <span className="text-gray-400 text-sm">N/A</span>}
                            </span>
                        }
                      </div>
                    ))}

                    <Link href={isLoggedIn ? `/dashboard/data` : '/auth'}
                          className="cp-btn-red mt-3 block w-full text-center py-2.5 rounded-xl font-semibold text-sm">
                      Buy {net.name} Data
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-gray-500">
              Prices shown are our live discounted rates — direct carrier purchases cost significantly more.{' '}
              <Link href="/pricing" className="text-red-600 font-semibold hover:text-red-700 transition-colors">View all plans →</Link>
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 px-6 lg:px-12" style={{ background: 'linear-gradient(to bottom, #f9fafb, #ffffff)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-4">Getting Started</span>
              <h2 className="cp-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Up and Running in 3 Steps</h2>
              <p className="text-base text-gray-500">Most users complete their first purchase within 2 minutes of landing here.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px" style={{ background: 'linear-gradient(90deg, transparent, #fecaca, transparent)' }} />
              {[
                { num: '01', title: 'Create Your Account', desc: "Phone number and email — that's all. No documents, no delays. Takes 60 seconds." },
                { num: '02', title: 'Fund Your Wallet',    desc: 'Bank transfer, debit card, or USSD. Minimum ₦100. Money reflects instantly.' },
                { num: '03', title: 'Buy and Receive',     desc: 'Pick a service, confirm, done. Delivery in 10 seconds or less — guaranteed.' },
              ].map(({ num, title, desc }) => (
                <div key={num} className="text-center group">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 cp-display text-xl font-bold transition-all duration-300 group-hover:scale-110"
                       style={{ background: '#fef2f2', color: '#dc2626', border: '2px solid #fecaca' }}>{num}</div>
                  <h3 className="cp-display text-xl font-bold text-gray-900 mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 text-center">
              <Link href="/auth" className="cp-btn-red inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm">
                Start Your First Purchase <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section id="features" className="py-24 px-6 lg:px-12 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-14">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-4">Why ConnectPay</span>
              <h2 className="cp-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Built on Three Promises</h2>
              <p className="text-base text-gray-500" style={{ maxWidth: '460px' }}>We built every feature around what Nigerian users actually need.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Zap,            title: '10-Second Delivery',  stat: '99.9% Success Rate',  desc: 'Every transaction processes in under 10 seconds. Miss it and we automatically refund you double — no questions asked.' },
                { icon: Shield,         title: 'Bank-Grade Security', stat: '₦2.8B+ Secured',      desc: '256-bit SSL encryption and PCI DSS compliance protect every naira you entrust to ConnectPay.' },
                { icon: HeadphonesIcon, title: 'Real 24/7 Support',   stat: '4.8★ Customer Rating', desc: 'Actual humans — not bots — respond in under 2 minutes, every hour of every day, including public holidays.' },
              ].map(({ icon: Icon, title, stat, desc }) => (
                <div key={title} className="cp-why rounded-2xl p-7">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-red-600" style={{ background: '#fef2f2' }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="cp-display text-xl font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500 mb-5">{desc}</p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-600 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                    <TrendingUp className="w-4 h-4" /> {stat}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 px-6 lg:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-4">Customer Reviews</span>
              <h2 className="cp-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Loved by 50,000+ Nigerians</h2>
              <p className="text-base text-gray-500">Real customers. Real results. Every review unedited.</p>
            </div>
            <div className="cp-marquee">
              <div className="cp-track">
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                  <div key={i} className="w-72 flex-shrink-0 rounded-2xl p-5 bg-white" style={{ border: '2px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, s) => <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-sm leading-relaxed mb-4 text-gray-700">"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${t.color} flex-shrink-0`}>{t.initials}</div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                        <p className="text-[10px] text-gray-500">{t.location}, Nigeria</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-6 lg:px-12 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-4">FAQ</span>
              <h2 className="cp-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Common Questions</h2>
              <p className="text-base text-gray-500">Everything you need to know before getting started.</p>
            </div>
            <div className="space-y-3">
              {FAQS.map(({ q, a }, i) => (
                <div key={i} className="cp-faq rounded-xl overflow-hidden" style={{ border: `2px solid ${faqOpen[i] ? '#fca5a5' : '#e5e7eb'}` }}>
                  <button onClick={() => toggleFaq(i)} className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 hover:bg-white transition-colors">
                    <span className="font-semibold text-sm text-gray-900">{q}</span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0 text-red-600 transition-transform duration-300" style={{ transform: faqOpen[i] ? 'rotate(180deg)' : 'rotate(0)' }} />
                  </button>
                  <div className={`cp-faq-body ${faqOpen[i] ? 'open' : ''}`}>
                    <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">{a}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-gray-500">
              Still have questions?{' '}
              <Link href="/contact" className="font-semibold text-red-600 hover:text-red-700 transition-colors">Talk to our support team →</Link>
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}