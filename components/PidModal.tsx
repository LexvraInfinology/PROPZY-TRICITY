'use client';

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';

export const PidModal: React.FC = () => {
  const { isPidModalOpen, closePidModal } = useApp();

  if (!isPidModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0a110d] rounded-3xl shadow-2xl border border-emerald-900/80 p-5 sm:p-6 text-gray-100">
        <button
          onClick={closePidModal}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-emerald-950 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#0d2217] text-emerald-400 border border-emerald-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Search Everything & Property ID</h2>
          <p className="text-xs text-gray-400 mt-1">Search properties by PROP-ID (e.g. 101), title, city, or locality in real time.</p>
        </div>

        <div className="my-4">
          <GlobalSearchBar
            mode="public"
            placeholder="Search PROP-ID, Title, City, Locality (e.g. 101)..."
          />
        </div>

        <div className="mt-4 p-3 bg-[#071910] rounded-xl border border-emerald-900/60 text-center">
          <span className="text-[11px] text-emerald-300 font-medium">
            Try sample searches: <strong className="text-emerald-400 font-mono">101</strong>, <strong className="text-emerald-400 font-mono">2 BHK</strong>, <strong className="text-emerald-400 font-mono">Mohali</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
