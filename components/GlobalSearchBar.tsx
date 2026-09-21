'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ShieldCheck, MapPin, Building, Loader2, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface SuggestionItem {
  _id?: string;
  id?: string;
  pid: string;
  title: string;
  locality: string;
  city: string;
  price: number | string;
  category: string;
  type: string;
  verified?: boolean;
  images?: string[];
  videos?: string[];
  videoThumbnail?: string;
}

interface GlobalSearchBarProps {
  placeholder?: string;
  mode?: 'public' | 'admin';
  className?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  placeholder = 'Search by Title, City, Locality, PROP-ID (e.g. 2 BHK, Mohali, 101)...',
  mode = 'public',
  className = '',
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Auto-Suggestion Fetch (250ms)
  const fetchSuggestions = useCallback((searchQuery: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!searchQuery.trim()) {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSuggestions(data.data);
          setIsOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.warn('Suggestion fetch failed:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
        setSelectedIndex(-1);
      }
    }, 250);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchSuggestions(val);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setIsOpen(false);
    if (mode === 'admin') {
      router.push(`/admin/properties?pid=${encodeURIComponent(item.pid)}`);
    } else {
      router.push(`/properties/${encodeURIComponent(item.pid || item.id || '')}`);
    }
  };

  const handleFullSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsOpen(false);
    const cleanQ = query.trim();

    if (mode === 'admin') {
      router.push(`/admin/properties?search=${encodeURIComponent(cleanQ)}`);
    } else {
      router.push(`/properties?search=${encodeURIComponent(cleanQ)}`);
    }
  };

  // Keyboard navigation handler (Up, Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') handleFullSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleFullSearch();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <form onSubmit={handleFullSearch} className="relative flex items-center">
        <input
          type="text"
          suppressHydrationWarning
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && query.trim()) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border transition-all focus:outline-none ${mode === 'admin'
              ? 'bg-[#09110c] border-emerald-900/80 text-white placeholder-gray-500 focus:border-emerald-500 font-mono tracking-wide'
              : 'bg-[#07100a] border-emerald-900/70 text-white placeholder-gray-400 focus:border-emerald-500 shadow-inner'
            }`}
        />
        <Search className="absolute left-3 text-emerald-400 pointer-events-none" size={14} />

        {loading ? (
          <Loader2 size={14} className="absolute right-3 text-emerald-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 text-gray-400 hover:text-white rounded-full"
          >
            <X size={13} />
          </button>
        ) : null}
      </form>

      {/* Auto-Suggestion Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-[#09120c] border border-emerald-900/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {suggestions.length > 0 ? (
            <div className="divide-y divide-emerald-950/80">
              <div className="px-3.5 py-1.5 bg-[#050806] text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex justify-between items-center">
                <span>Matching Suggestions ({suggestions.length})</span>
                <span className="text-gray-500 font-mono">Use ↑↓ & Enter</span>
              </div>

              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const getVideoPoster = (url?: string) => {
                  if (!url) return null;
                  if (url.includes('res.cloudinary.com')) {
                    return url.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg').replace('/video/upload/', '/video/upload/so_0,q_auto,f_auto/');
                  }
                  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
                  if (ytMatch && ytMatch[1]) {
                    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                  }
                  return null;
                };
                const thumb = (item.images && item.images.length > 0 ? item.images[0] : null) || item.videoThumbnail || (item.videos && item.videos[0] ? getVideoPoster(item.videos[0]) : null);

                return (
                  <div
                    key={item.pid || item._id || idx}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-2.5 flex items-center space-x-3 cursor-pointer transition-colors ${isSelected ? 'bg-[#0e2417] text-white' : 'hover:bg-[#0b1a11] text-gray-200'
                      }`}
                  >
                    {/* Thumbnail */}
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        className="w-11 h-11 rounded-lg object-cover border border-emerald-900/60 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-[#050906] border border-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-400">
                        <Building size={18} />
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                          PROP-ID: {item.pid?.replace(/^(PZ|LR)-/i, '')}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-0.5">
                        <span className="flex items-center">
                          <MapPin size={10} className="mr-0.5 text-emerald-400" />
                          {item.locality}, {item.city}
                        </span>
                        <span>•</span>
                        <span className="capitalize text-emerald-300 font-semibold">{item.category}</span>
                      </div>
                    </div>

                    {/* Price Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-emerald-400 whitespace-nowrap">{formatPrice(item.price)}</div>
                      {item.verified && (
                        <div className="inline-flex items-center space-x-0.5 text-[9px] font-bold text-emerald-400">
                          <ShieldCheck size={10} />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* View All Button */}
              <button
                type="button"
                onClick={() => handleFullSearch()}
                className="w-full p-2.5 bg-[#050907] hover:bg-[#08170d] text-emerald-400 text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>View all results for &quot;{query}&quot;</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300">No properties found matching &quot;{query}&quot;</p>
              <p className="text-[11px] text-gray-500">Try searching by PROP-ID (e.g. 101), locality, city, or property type.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
