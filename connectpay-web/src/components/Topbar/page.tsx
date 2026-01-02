'use client';

import React from 'react';
import { Phone, Mail } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-red-600 text-white py-2 px-4 sm:px-6 lg:px-8 text-[10px] sm:text-xs fixed top-0 left-0 right-0 w-full z-50 h-[32px] sm:h-[36px] flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        {/* Horizontal scroll on mobile, row on desktop */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90 flex-shrink-0" />
            <span className="text-white font-medium">+234 800 123 4567</span>
          </div>
          
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90 flex-shrink-0" />
            <span className="text-white font-medium">support@connectpay.ng</span>
          </div>
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