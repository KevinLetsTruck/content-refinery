"use client";

import { useState, useEffect } from "react";
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

// Extended type for challenge-specific fields
interface ChallengeData {
  duration: string; // e.g., "7 days", "21 days"
  startDate?: string; // ISO date string
  dailyBreakdown?: Array<{
    day: number;
    title: string;
    description: string;
  }>;
  whatYouGet?: string[];
  whoItsFor?: string[];
  bonuses?: Array<{
    title: string;
    value?: string;
  }>;
}

export function ChallengeTemplate({ page, tracking }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Challenge-specific data (stored in page.features or custom field)
  const challenge: ChallengeData = (page as any).challenge || {
    duration: "7 days",
    startDate: undefined,
  };

  // Countdown timer
  useEffect(() => {
    if (!challenge.startDate) return;

    const targetDate = new Date(challenge.startDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [challenge.startDate]);

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">{page.thankYou.headline}</h1>
          <p className="text-xl text-purple-200 mb-10">{page.thankYou.message}</p>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-3">What happens next:</h3>
            <ol className="text-left space-y-3 text-purple-100">
              <li className="flex gap-3">
                <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">1</span>
                <span>Check your email for challenge details</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">2</span>
                <span>Mark your calendar for Day 1</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">3</span>
                <span>Get ready to transform your health</span>
              </li>
            </ol>
          </div>
          
          <div className="space-y-4">
            {page.thankYou.ctas.map((cta, index) => (
              <a
                key={index}
                href={cta.url}
                className={`block w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  cta.style === "primary"
                    ? "bg-amber-500 hover:bg-amber-400 text-black"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
              >
                {cta.text}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Challenge Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        {/* Badge */}
        <div className="text-center mb-6">
          <span className="inline-block bg-amber-500 text-black px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
            Free {challenge.duration} Challenge
          </span>
        </div>
        
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 leading-tight">
          {page.headline}
        </h1>
        
        {/* Subheadline */}
        {page.subheadline && (
          <p className="text-xl md:text-2xl text-purple-200 text-center mb-8 max-w-2xl mx-auto">
            {page.subheadline}
          </p>
        )}

        {/* Countdown Timer */}
        {challenge.startDate && (
          <div className="max-w-lg mx-auto mb-10">
            <p className="text-center text-purple-300 mb-3 text-sm uppercase tracking-wide">Challenge Starts In:</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hours" },
                { value: countdown.minutes, label: "Mins" },
                { value: countdown.seconds, label: "Secs" },
              ].map((item, index) => (
                <div key={index} className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                  <div className="text-3xl md:text-4xl font-bold">{item.value}</div>
                  <div className="text-xs text-purple-300 uppercase">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* Left: What You'll Learn */}
          <div className="lg:col-span-3 space-y-10">
            
            {/* Daily Breakdown */}
            {challenge.dailyBreakdown && challenge.dailyBreakdown.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Your {challenge.duration} Journey
                </h2>
                <div className="space-y-4">
                  {challenge.dailyBreakdown.map((day, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
                      <div className="flex items-start gap-4">
                        <div className="bg-amber-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {day.day}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{day.title}</h3>
                          <p className="text-purple-200 text-sm mt-1">{day.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What You Get */}
            {challenge.whatYouGet && challenge.whatYouGet.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">What You&apos;ll Get:</h2>
                <ul className="space-y-3">
                  {challenge.whatYouGet.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-lg text-purple-100">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Who It's For */}
            {challenge.whoItsFor && challenge.whoItsFor.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">This Challenge Is For You If:</h2>
                <ul className="space-y-3">
                  {challenge.whoItsFor.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-lg text-purple-100">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits fallback */}
            {!challenge.dailyBreakdown && page.benefits && page.benefits.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">What You&apos;ll Learn:</h2>
                <ul className="space-y-4">
                  {page.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-lg text-purple-100">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trust Elements */}
            {page.trustElements && page.trustElements.length > 0 && (
              <div className="pt-6 border-t border-white/10">
                <div className="flex flex-wrap gap-6">
                  {page.trustElements.map((trust, index) => (
                    <div key={index} className="flex items-center gap-2 text-purple-300">
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{trust}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-2xl sticky top-6">
              <div className="text-center mb-6">
                <p className="text-amber-600 font-bold text-sm uppercase tracking-wide mb-1">100% Free</p>
                <h3 className="text-2xl font-bold text-gray-900">Join the Challenge</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {page.formFields.includes("firstName") && (
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Your first name"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                
                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? "Joining..." : page.ctaText}
                </button>
                
                {page.ctaSubtext && (
                  <p className="text-center text-gray-500 text-sm">{page.ctaSubtext}</p>
                )}
              </form>

              {/* Bonuses */}
              {challenge.bonuses && challenge.bonuses.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">PLUS, You&apos;ll Get:</p>
                  <ul className="space-y-2">
                    {challenge.bonuses.map((bonus, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{bonus.title}</span>
                        {bonus.value && <span className="text-green-600 font-medium">({bonus.value})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t border-white/10 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-purple-300 text-sm">
          <p>© {new Date().getFullYear()} Let&apos;s Truck. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
