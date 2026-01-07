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

// Extended type for product launch specific fields
interface ProductData {
  price: string;
  originalPrice?: string;
  priceSubtext?: string;
  buyUrl: string;
  buyButtonText?: string;
  
  // Product details
  productImage?: string;
  productImages?: string[];
  
  // Problem/Solution
  problem?: {
    headline: string;
    points: string[];
  };
  solution?: {
    headline: string;
    description: string;
  };
  
  // Features with icons
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  
  // Ingredients/Specs (for supplements)
  specs?: Array<{
    label: string;
    value: string;
  }>;
  
  // How it works
  howItWorks?: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  
  // FAQ
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  
  // Guarantee
  guarantee?: {
    title: string;
    description: string;
    duration?: string;
  };
  
  // Urgency
  urgency?: {
    type: "limited_stock" | "sale_ending" | "bonus_expiring";
    message: string;
  };
}

export function ProductLaunchTemplate({ page, tracking }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Product-specific data
  const product: ProductData = (page as any).product || {
    price: "$47",
    buyUrl: "#",
    buyButtonText: "Buy Now",
  };

  const handleBuyClick = () => {
    // Add UTM params to buy URL
    const url = new URL(product.buyUrl);
    if (tracking.utm_source) url.searchParams.set("utm_source", tracking.utm_source);
    if (tracking.utm_medium) url.searchParams.set("utm_medium", tracking.utm_medium);
    if (tracking.utm_campaign) url.searchParams.set("utm_campaign", tracking.utm_campaign);
    if (tracking.utm_content) url.searchParams.set("utm_content", tracking.utm_content);
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      
      {/* Urgency Banner */}
      {product.urgency && (
        <div className="bg-red-600 text-white py-3 px-6 text-center">
          <p className="font-semibold text-sm md:text-base">
            🔥 {product.urgency.message}
          </p>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left: Copy */}
            <div>
              {/* Badge */}
              <span className="inline-block bg-amber-500 text-black px-3 py-1 rounded-full text-sm font-bold mb-6">
                DRIVER-TESTED
              </span>
              
              {/* Headline */}
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {page.headline}
              </h1>
              
              {/* Subheadline */}
              {page.subheadline && (
                <p className="text-xl text-gray-300 mb-8">
                  {page.subheadline}
                </p>
              )}
              
              {/* Benefits */}
              {page.benefits && page.benefits.length > 0 && (
                <ul className="space-y-3 mb-8">
                  {page.benefits.slice(0, 4).map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-200">{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={handleBuyClick}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg px-8 py-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  {product.buyButtonText || "Buy Now"} — {product.price}
                </button>
                {product.originalPrice && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="line-through">{product.originalPrice}</span>
                    <span className="text-green-400 font-semibold">Save {calculateDiscount(product.originalPrice, product.price)}</span>
                  </div>
                )}
              </div>
              
              {product.priceSubtext && (
                <p className="text-gray-400 text-sm mt-3">{product.priceSubtext}</p>
              )}
            </div>
            
            {/* Right: Product Image */}
            <div className="flex justify-center">
              {product.productImage ? (
                <img 
                  src={product.productImage} 
                  alt={page.title}
                  className="max-w-sm w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-80 h-80 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Product Image</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Bar */}
      {page.trustElements && page.trustElements.length > 0 && (
        <div className="bg-gray-100 py-6">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-8">
              {page.trustElements.map((trust, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{trust}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Problem Section */}
      {product.problem && (
        <div className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
              {product.problem.headline}
            </h2>
            <div className="space-y-4">
              {product.problem.points.map((point, index) => (
                <div key={index} className="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-gray-700">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Solution Section */}
      {product.solution && (
        <div className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {product.solution.headline}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {product.solution.description}
            </p>
          </div>
        </div>
      )}

      {/* Features Grid */}
      {product.features && product.features.length > 0 && (
        <div className="py-16 md:py-24 bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What Makes This Different
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {product.features.map((feature, index) => (
                <div key={index} className="bg-gray-800 rounded-xl p-6">
                  <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      {product.howItWorks && product.howItWorks.length > 0 && (
        <div className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="space-y-8">
              {product.howItWorks.map((step, index) => (
                <div key={index} className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-amber-500 text-black rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Specs/Ingredients */}
      {product.specs && product.specs.length > 0 && (
        <div className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What&apos;s Inside
            </h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {product.specs.map((spec, index) => (
                  <div key={index} className="flex justify-between items-center p-4">
                    <span className="font-medium text-gray-900">{spec.label}</span>
                    <span className="text-gray-600">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {page.testimonials && page.testimonials.length > 0 && (
        <div className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What Drivers Are Saying
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {page.testimonials.map((testimonial, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">&quot;{testimonial.quote}&quot;</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    {testimonial.role && (
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      {product.faq && product.faq.length > 0 && (
        <div className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {product.faq.map((item, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-semibold text-gray-900">{item.question}</span>
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guarantee */}
      {product.guarantee && (
        <div className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 md:p-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{product.guarantee.title}</h3>
              <p className="text-gray-600 mb-4">{product.guarantee.description}</p>
              {product.guarantee.duration && (
                <p className="text-green-700 font-semibold">{product.guarantee.duration}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className="py-16 md:py-24 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Health?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of drivers who&apos;ve already made the switch.
          </p>
          
          <div className="inline-block bg-gray-800 rounded-2xl p-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              {product.originalPrice && (
                <span className="text-2xl text-gray-500 line-through">{product.originalPrice}</span>
              )}
              <span className="text-5xl font-bold">{product.price}</span>
            </div>
            {product.priceSubtext && (
              <p className="text-gray-400 mb-6">{product.priceSubtext}</p>
            )}
            <button
              onClick={handleBuyClick}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xl px-12 py-5 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              {product.buyButtonText || "Buy Now"}
            </button>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-gray-400">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Checkout
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              All Major Cards Accepted
            </span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-950 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Let&apos;s Truck. All rights reserved.</p>
          <p className="mt-2">These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.</p>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate discount percentage
function calculateDiscount(original: string, current: string): string {
  const origNum = parseFloat(original.replace(/[^0-9.]/g, ''));
  const currNum = parseFloat(current.replace(/[^0-9.]/g, ''));
  const discount = Math.round((1 - currNum / origNum) * 100);
  return `${discount}%`;
}
