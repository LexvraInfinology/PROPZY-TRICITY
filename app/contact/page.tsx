'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Instagram,
  ArrowRight
} from 'lucide-react';
import { CallToActionBanner } from '@/components/CallToActionBanner';
import { notifyAdminSync } from '@/lib/adminCache';
import { useApp } from '@/context/AppContext';

const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ContactPage() {
  const { showToast } = useApp();
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    company: '',
    inquiryType: 'General Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.workEmail || !formData.message) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          workEmail: formData.workEmail.trim(),
          company: (formData.company || '').trim(),
          inquiryType: formData.inquiryType,
          message: formData.message.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notifyAdminSync('contacts');
        setSubmitted(true);
        showToast('Your message has been sent successfully!', 'success');
      } else {
        const errorText = data.message || 'Failed to submit contact form. Please try again or email us directly.';
        setErrorMessage(errorText);
        showToast(errorText, 'error');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      const errorText = 'Network error occurred. Please try again or reach us at propzytricity@gmail.com.';
      setErrorMessage(errorText);
      showToast(errorText, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040806] text-white">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: HERO HEADER (EXACT SCREENSHOT 1 DESIGN)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-20 overflow-hidden bg-gradient-to-b from-[#06140b] via-[#040906] to-[#040806]">
        {/* Neon Green Radial Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* City Skyline Vector Illustration Background */}
        <div className="absolute inset-x-0 bottom-0 opacity-25 pointer-events-none flex justify-center overflow-hidden">
          <svg className="w-full max-w-6xl h-52 sm:h-64 text-emerald-500 stroke-current fill-none" viewBox="0 0 1200 300" xmlns="http://www.w3.org/2000/svg">
            <path d="M50,300 L50,180 L90,180 L90,300 M90,300 L90,140 L150,140 L150,300 M150,300 L150,200 L200,200 L200,300 M250,300 L250,80 L350,80 L350,300 M350,300 L350,160 L420,160 L420,300 M450,300 L450,100 L520,100 L520,300 M520,300 L520,50 L650,50 L650,300 M650,300 L650,120 L730,120 L730,300 M750,300 L750,90 L850,90 L850,300 M850,300 L850,170 L920,170 L920,300 M950,300 L950,130 L1050,130 L1050,300 M1050,300 L1050,210 L1150,210 L1150,300" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="600" cy="80" r="3.5" fill="#10b981" />
            <circle cx="300" cy="110" r="3.5" fill="#10b981" />
            <circle cx="800" cy="120" r="3.5" fill="#10b981" />   
          </svg>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-4 sm:space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
            <span>★</span>
            <span>Contact Us</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
            Let's Talk About Your <br />
            <span className="italic font-serif font-normal text-emerald-400">
              Next Property.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-gray-300 text-xs sm:text-sm max-w-xl mx-auto font-normal leading-relaxed">
            Whether you're looking for your dream home, need help finding the perfect rental, or want to list your property, our team is here to help every step of the way.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: CONTACT FORM & DIRECT DETAILS (EXACT SCREENSHOT 2)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-8 sm:py-12 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-8 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-[#070e0a] border border-emerald-900/60 shadow-2xl space-y-5 sm:space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">Send us a message</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Fill in your details and we'll get back to you within 2 hours.
              </p>
            </div>

            {submitted ? (
              <div className="py-8 sm:py-12 text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle size={28} className="sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Message Received!</h3>
                <p className="text-xs text-gray-300 max-w-md mx-auto">
                  Thank you for contacting Propzy. Our support team will respond to your email within 2 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ fullName: '', workEmail: '', company: '', inquiryType: 'General Inquiry', message: '' });
                  }}
                  className="mt-2 px-6 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center space-x-2">
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Row 1: Full Name & Work Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Maya Okonkwo"
                      className="w-full px-4 py-3 rounded-xl bg-[#0b1610] border border-emerald-950 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      placeholder="maya@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#0b1610] border border-emerald-950 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: Company & Inquiry Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Nexora Inc."
                      className="w-full px-4 py-3 rounded-xl bg-[#0b1610] border border-emerald-950 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Inquiry Type</label>
                    <select
                      value={formData.inquiryType}
                      onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b1610] border border-emerald-950 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Property Listing Help">Property Listing Help</option>
                      <option value="Tenant / Owner Help">Tenant / Owner Help</option>
                      <option value="Corporate Partnership">Corporate Partnership</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Message *</label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your project, team size, and how we can help..."
                    className="w-full px-4 py-3 rounded-xl bg-[#0b1610] border border-emerald-950 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || submitted}
                  className="w-full py-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Sending Message...' : 'Send Message'}</span>
                  <ArrowRight size={18} />
                </button>

                <p className="text-[11px] text-gray-500 text-center font-normal pt-1">
                  By submitting, you agree to our <Link href="/privacy" className="text-gray-300 cursor-pointer underline underline-offset-2">Privacy Policy</Link>. We never share your data.
                </p>
              </form>
            )}
          </div>

          {/* Right Column: Cards Stack */}
          <div className="lg:col-span-4 space-y-5">
            {/* Card 1: Live Status Header */}
            <div className="p-5 rounded-2xl bg-[#070f0b] border border-emerald-900/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">All systems operational</span>
              </div>
            </div>

            {/* Card 2: REACH US DIRECTLY */}
            <div className="p-6 rounded-3xl bg-[#070e0a] border border-emerald-900/60 space-y-6">
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-gray-400">
                REACH US DIRECTLY
              </h3>

              <div className="space-y-4">
                {/* Operating Name */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0d1d13] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">OPERATING NAME</div>
                    <div className="text-xs font-semibold text-white mt-0.5">Propzy Tricity</div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0d1d13] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">OFFICIAL SUPPORT EMAIL</div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      <a href="mailto:propzytricity@gmail.com" className="hover:text-emerald-400 transition-colors">
                        propzytricity@gmail.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0d1d13] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Phone size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">PHONE & HELPLINE</div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      <a href="tel:+919317902609" className="hover:text-emerald-400 transition-colors">
                        +91 93179 02609
                      </a>
                    </div>
                  </div>
                </div>

                {/* Physical Address */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0d1d13] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">REGISTERED PHYSICAL ADDRESS</div>
                    <div className="text-xs font-semibold text-white mt-0.5 leading-relaxed">
                      4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307, India
                    </div>
                  </div>
                </div>

                {/* Support Hours */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0d1d13] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">SUPPORT OPERATING HOURS</div>
                    <div className="text-xs font-semibold text-white mt-0.5">Monday – Saturday: 9:00 AM – 7:00 PM IST</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: FOLLOW US & CONNECT */}
            <div className="p-6 rounded-3xl bg-[#070e0a] border border-emerald-900/60 space-y-4">
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-gray-400">
                FOLLOW & CONNECT
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href="https://www.instagram.com/propzytricity/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-[#0b1610] border border-emerald-950 hover:border-emerald-700/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                >
                  <Instagram size={20} className="text-gray-400 group-hover:text-emerald-400 transition-colors mb-1.5" />
                  <span className="text-xs font-semibold text-white">Instagram</span>
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5 group-hover:text-emerald-400 transition-colors">@propzytricity</span>
                </a>

                <a
                  href="https://wa.me/919317902609"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-[#0b1610] border border-emerald-950 hover:border-emerald-700/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                >
                  <WhatsAppIcon size={20} className="text-gray-400 group-hover:text-emerald-400 transition-colors mb-1.5" />
                  <span className="text-xs font-semibold text-white">WhatsApp</span>

                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Plain Text Corporate & Merchant Compliance Information */}
        <div className="mt-8 p-6 rounded-2xl bg-[#060c08] border border-emerald-900/60 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            <span>Corporate & Merchant Verification Information</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div>
              <span className="text-gray-400 font-mono text-[11px] block">OPERATING / TRADE NAME:</span>
              <span className="font-semibold text-white">Propzy Tricity</span>
            </div>
            <div>
              <span className="text-gray-400 font-mono text-[11px] block">OFFICIAL SUPPORT EMAIL:</span>
              <span className="font-semibold text-white">propzytricity@gmail.com</span>
            </div>
            <div>
              <span className="text-gray-400 font-mono text-[11px] block">DIRECT HELPLINE:</span>
              <span className="font-semibold text-white">+91 93179 02609</span>
            </div>
            <div>
              <span className="text-gray-400 font-mono text-[11px] block">OPERATING HOURS:</span>
              <span className="font-semibold text-white">Monday to Saturday: 9:00 AM – 7:00 PM IST</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-gray-400 font-mono text-[11px] block">COMPLETE REGISTERED OFFICE ADDRESS:</span>
              <span className="font-semibold text-white">4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307, India</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: BOTTOM CTA BANNER (EXACT SCREENSHOT 3 COMPONENT)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <CallToActionBanner
          subTag="IS READY TO MOVE"
          titleMain="Let's find your"
          titleItalic="perfect space."
          description="Verified homes. Zero brokerage. Hassle-free renting."
          buttonText="Explore Properties"
          buttonHref="/properties"
        />
      </section>
    </div>
  );
}
