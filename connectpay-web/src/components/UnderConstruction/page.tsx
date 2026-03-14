'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface UnderConstructionProps {
  pageTitle?: string;
  pageDescription?: string;
  backLink?: string;
  backLinkText?: string;
  alternativeLink?: string;
  alternativeLinkText?: string;
}

export default function UnderConstruction({
  pageTitle = "This Page",
  pageDescription = "We're currently working on this page. Check back soon or explore our other services!",
  backLink = "/dashboard",
  backLinkText = "Back to Dashboard",
  alternativeLink = "/",
  alternativeLinkText = "Go to Home"
}: UnderConstructionProps) {
  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-xl w-full text-center">
        {/* Heading */}
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
          {pageTitle} is Under Construction
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed max-w-lg mx-auto">
          {pageDescription}
        </p>

        {/* Info Box */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <div className="flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                In the meantime, you can still access all our available services including 
                <span className="font-semibold text-gray-900"> Airtime Top-Up, Data Bundles, Cable TV, and Electricity</span> payments.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link 
            href={backLink}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transform hover:scale-105 transition-all w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLinkText}
          </Link>
          
          <Link 
            href={alternativeLink}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 px-5 py-2.5 rounded-lg font-bold text-sm border-2 border-gray-300 hover:border-gray-400 transition-all w-full sm:w-auto justify-center"
          >
            {alternativeLinkText}
          </Link>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-xs sm:text-sm text-gray-500">
          Questions? Contact our{' '}
          <Link href="/contact" className="text-red-600 hover:text-red-700 font-semibold underline">
            24/7 support team
          </Link>
        </p>
      </div>
    </div>
  );
}