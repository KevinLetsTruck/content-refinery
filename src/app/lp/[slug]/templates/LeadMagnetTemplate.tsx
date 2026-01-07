"use client";

import { useState } from "react";
import { LandingPageData } from "@/lib/landing-pages/types";

interface Props {
  page: LandingPageData;
  tracking: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
  };
}

export function LeadMagnetTemplate({ page, tracking }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/lp/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: page.slug,
          email,
          firstName,
          ...tracking,
        }),
      });

      if (!response.ok) {
        throw new Error("Subscription failed");
      }

      setIsSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thank You State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="mb-8">
            <svg className="w-20 h-20 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">{page.thankYou.headline}</h1>
          <p className="text-xl text-gray-300 mb-10">{page.thankYou.message}</p>
          
          <div className="space-y-4">
            {page.thankYou.ctas.map((cta, index) => (
              <a
                key={index}
                href={cta.url}
                className={`block w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  cta.style === "primary"
                    ? "bg-amber-500 hover:bg-amber-400 text-black"
                    : "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                }`}
              >
                {cta.text}
              </a>
            ))}
          </div>
          
          {page.leadMagnet && (
            <div className="mt-10 p-6 bg-gray-800 rounded-lg">
              <p className="text-gray-400 mb-3">Your guide is also available here:</p>
              <a
                href={page.leadMagnet.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Download: {page.leadMagnet.title}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-10">
        {/* Badge */}
        <div className="text-center mb-6">
          <span className="inline-block bg-amber-500/20 text-amber-400 px-4 py-1 rounded-full text-sm font-medium">
            FREE GUIDE
          </span>
        </div>
        
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 leading-tight">
          {page.headline}
        </h1>
        
        {/* Subheadline */}
        {page.subheadline && (
          <p className="text-xl md:text-2xl text-gray-300 text-center mb-10 max-w-2xl mx-auto">
            {page.subheadline}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          
          {/* Left: Benefits */}
          <div>
            <h2 className="text-2xl font-bold mb-6">What You&apos;ll Learn:</h2>
            
            <ul className="space-y-4">
              {page.benefits?.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-lg text-gray-200">{benefit}</span>
                </li>
              ))}
            </ul>
            
            {/* Trust Elements */}
            {page.trustElements && page.trustElements.length > 0 && (
              <div className="mt-10 pt-8 border-t border-gray-700">
                <div className="space-y-3">
                  {page.trustElements.map((trust, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-400">
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{trust}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Form */}
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
            {page.leadMagnet && (
              <div className="text-center mb-6">
                <p className="text-amber-400 font-semibold mb-2">FREE DOWNLOAD</p>
                <h3 className="text-xl font-bold">{page.leadMagnet.title}</h3>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {page.formFields.includes("firstName") && (
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Your first name"
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              
              {error && (
                <div className="text-red-400 text-sm">{error}</div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : page.ctaText}
              </button>
              
              {page.ctaSubtext && (
                <p className="text-center text-gray-400 text-sm">{page.ctaSubtext}</p>
              )}
            </form>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Let&apos;s Truck. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
