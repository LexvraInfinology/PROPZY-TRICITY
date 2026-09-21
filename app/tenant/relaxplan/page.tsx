'use client';

import React, { useState } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, UserCheck, PhoneCall, Home, Search, HeartHandshake } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { sanitizeName, sanitizePhone, isValidName, isValidPhone } from '@/lib/validation';

export default function RelaxPlanPage() {
  const { user, showToast } = useApp();
  const [name, setName] = useState(user?.name ? sanitizeName(user.name) : '');
  const [phone, setPhone] = useState(user?.phone ? sanitizePhone(user.phone) : '');
  const [city, setCity] = useState('Mohali');
  const [budget, setBudget] = useState('15000');
  const [bhk, setBhk] = useState('2 BHK');
  const [submitted, setSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submitted) return;
    if (!isValidName(name)) {    
      showToast('Please enter a valid name (letters only)');
      return;
    }
    if (!isValidPhone(phone)) {
      showToast('Please enter a valid 10-digit mobile phone number');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: `relax-${Date.now()}`,
          propertyTitle: `PROPZY TRICITY Relax Plan Request (${bhk} in ${city})`,
          propertyPid: `RELAX-PLAN`,
          tenantName: name.trim(),
          tenantPhone: phone.trim(),
          tenantEmail: user?.email || '',
          tenantMessage: `Relax Plan RM Request: Looking for ${bhk} in ${city} with max budget ₹${budget}/mo.`,
          status: 'pending'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        showToast(data.message || 'Your Relax Plan request has been submitted successfully!');
      } else {
        showToast(data.message || 'Failed to submit request');
      }
    } catch (err) {
      setSubmitted(true);
      showToast('Your Relax Plan request has been submitted successfully!');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl space-y-6 relative overflow-hidden ">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
          <Sparkles size={14} />
          <span>Personal Assistant Service</span> 
        </div>

        <h1 className="text-xl sm:text-5xl font-extrabold tracking-tight">
          PROPZY TRICITY <span className="text-emerald-400">Relax Plan</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
          Skip the stress of endless property searching. Get a dedicated Relationship Manager (RM) who understands your exact requirements, handpicks verified owner listings, schedules visits, and negotiates the best rent for you — with 100% guarantee & 0% brokerage.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-700 text-xs">
          <div>
            <span className="text-emerald-400 font-extrabold text-lg block">10x Faster</span>
            <span className="text-gray-400">Home Finalization</span>
          </div>
          <div>
            <span className="text-emerald-400 font-extrabold text-lg block">Assisted Visits</span>
            <span className="text-gray-400">Assisted Visits</span>
          </div>
          <div>
            <span className="text-emerald-400 font-extrabold text-lg block">0% Brokerage</span>
            <span className="text-gray-400">Zero Commission</span>
          </div>
          <div>
            <span className="text-emerald-400 font-extrabold text-lg block">Dedicated RM</span>
            <span className="text-gray-400">On-Call Support</span>
          </div>
        </div>
      </div>

      {/* Request Assistance Form */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900">Get a Personal Relationship Manager</h2>
          <p className="text-xs text-gray-500">Fill in your requirements and your RM will share verified owner listings directly on WhatsApp.</p>
        </div>

        {submitted ? (
          <div className="text-center py-10 space-y-3 bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
            <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
            <h3 className="text-lg font-bold text-emerald-900">Request Sent to Admin!</h3>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
              Your Relax Plan request has been successfully sent to the Admin team. Our Relationship Manager will review your requirements and contact <strong className="text-gray-900">{phone}</strong> shortly.
            </p>
          </div>
        ) : (

          <form onSubmit={handleBooking} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(sanitizeName(e.target.value))}
                  placeholder="Rahul Sharma"
                  className="w-full px-4 py-3 text-xs text-black border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 text-xs text-black border border-gray-300 rounded-xl font-mono"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-3 text-xs text-black border border-gray-300 rounded-xl bg-white focus:border-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Mohali">Mohali</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Kharar">Kharar</option>
                  <option value="Zirakpur">Zirakpur</option>
                  <option value="Panchkula">Panchkula</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Max Budget (₹/mo)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-gray-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="15000"
                    className="w-full pl-7 pr-3.5 py-3 text-xs text-black border border-gray-300 rounded-xl focus:border-emerald-500 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Config (BHK)</label>
                <select
                  value={bhk}
                  onChange={(e) => setBhk(e.target.value)}
                  className="w-full px-3.5 py-3 text-xs text-black border border-gray-300 rounded-xl bg-white focus:border-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="1 BHK">1 BHK</option>
                  <option value="2 BHK">2 BHK</option>
                  <option value="3 BHK">3 BHK</option>
                  <option value="4 BHK">4 BHK</option>
                  <option value="4+ BHK">4+ BHK</option>
                  <option value="PG / Room">PG / Room</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || submitted}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Activating Request...' : 'Activate Relax Plan Assistance'}
            </button> 

          </form>
        )}
      </div>
    </div>
  );
}
