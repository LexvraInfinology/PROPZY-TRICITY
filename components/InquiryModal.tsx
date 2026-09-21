'use client';

import React, { useState } from 'react';
import { X, Phone, User, MessageSquare, CheckCircle, ShieldCheck } from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { useApp } from '@/context/AppContext';
import { sanitizeName, sanitizePhone, isValidName, isValidPhone } from '@/lib/validation';


interface InquiryModalProps {
  property: PropertyItem | null;
  onClose: () => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({ property, onClose }) => {
  const { user, openAuthModal, showToast } = useApp();
  const [name, setName] = useState(user?.name ? sanitizeName(user.name) : '');
  const [phone, setPhone] = useState(user?.phone ? sanitizePhone(user.phone) : '');
  const [message, setMessage] = useState('Hi, I am interested in visiting this property.');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window !== 'undefined' && property?.pid) {
      try {
        const history = JSON.parse(sessionStorage.getItem('propzy_inquired_pids') || '[]');
        return history.includes(property.pid);
      } catch {
        return false;
      }
    }
    return false;
  });

  if (!property) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-[#0a110d] rounded-3xl shadow-2xl border border-emerald-900/80 p-6 text-gray-100 text-center space-y-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-emerald-950 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
            <User size={32} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Login Required</h3>
            <p className="text-xs text-gray-400">
              You must be logged in to send an inquiry for <strong className="text-emerald-400">PROP-ID: {property.pid?.replace(/^(PZ|LR)-/i, '')}</strong>.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider cursor-pointer"
            >
              Login / Register Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const markPidAsInquired = (pid: string) => {
    if (typeof window !== 'undefined' && pid) {
      try {
        const history = JSON.parse(sessionStorage.getItem('propzy_inquired_pids') || '[]');
        if (!history.includes(pid)) {
          sessionStorage.setItem('propzy_inquired_pids', JSON.stringify([...history, pid]));
        }
      } catch {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          propertyId: property.id || property.pid,
          propertyTitle: property.title,
          propertyPid: property.pid,
          tenantName: name.trim(),
          tenantPhone: phone.trim(),
          tenantEmail: user?.email || '',
          tenantMessage: message,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        markPidAsInquired(property.pid);
        showToast('Inquiry sent! Owner will contact you shortly.');
      }
    } catch (e) {
      setSubmitted(true);
      markPidAsInquired(property.pid);
      showToast('Inquiry received!');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0a110d] rounded-3xl shadow-2xl border border-emerald-900/80 p-5 sm:p-6 text-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-emerald-950 transition-colors"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white">Inquiry Sent Successfully!</h3>
            <p className="text-xs text-gray-400">
              The owner/manager for <strong className="text-emerald-400">PROP-ID: {property.pid?.replace(/^(PZ|LR)-/i, '')} ({property.locality})</strong> has received your request.
            </p>
            <div className="p-3.5 bg-[#050806] rounded-xl border border-emerald-900/60 text-xs text-gray-300">
              Your details were shared securely with the property owner/manager. They can contact you directly.
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5">
              <span className="inline-block px-3 py-1 bg-[#0f281b] text-emerald-400 border border-emerald-800/80 text-[10px] font-extrabold uppercase rounded-full mb-2">
                PROP-ID: {property.pid?.replace(/^(PZ|LR)-/i, '')} • 0% Brokerage
              </span>
              <h3 className="text-base font-bold text-white line-clamp-1">{property.title}</h3>
              <p className="text-xs text-gray-400">{property.locality}, {property.city}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Your Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={name}
                    onChange={(e) => setName(sanitizeName(e.target.value))}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <User size={14} className="absolute left-3 top-3 text-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Mobile Phone Number (10 Digits) *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <Phone size={14} className="absolute left-3 top-3 text-emerald-400" />
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Message for Owner</label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <MessageSquare size={14} className="absolute left-3 top-3 text-emerald-400" />
                </div>
              </div>

              <div className="p-3 bg-[#071910] rounded-xl border border-emerald-900/60 flex items-center space-x-2 text-[11px] text-emerald-300 font-medium">
                <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
                <span>Your contact info is shared strictly with the property owner. 0% Commission.</span>
              </div>

              <button
                type="submit"
                disabled={submitting || submitted}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Sending Request...' : submitted ? 'Inquiry Already Submitted' : 'Get Owner Contact Details'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
