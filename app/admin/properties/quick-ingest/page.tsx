'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles, UploadCloud, CheckCircle2, ArrowLeft, Trash2, Plus,
  ExternalLink, AlertCircle, Building, FileText, Image as ImageIcon,
  Check, RefreshCw, X, ShieldCheck, MapPin, Phone, User, Tag
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ExtractedData {
  title: string;
  category: 'rent' | 'pg' | 'buy' | 'commercial';
  type: 'flat' | 'house' | 'pg' | 'commercial';
  city: string;
  locality: string;
  address: string;
  price: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  areaSqFt?: number | null;
  furnishing: 'fully-furnished' | 'semi-furnished' | 'unfurnished';
  amenities: string[];
  description: string;
  ownerName: string;
  ownerPhone: string;
  ownerRole: 'owner' | 'agent';
}

const normalizeAmenity = (name: string): string => {
  const trimmed = name.trim();
  if (/^(air\s*conditioner|air\s*conditioning|a\/c)$/i.test(trimmed)) {
    return 'AC';
  }
  return trimmed;
};

const cleanListingTitle = (rawTitle: string, locality?: string, city?: string): string => {
  let clean = (rawTitle || '').trim();
  if (locality && locality.length > 2) {
    const escapedLoc = locality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\s*(?:in|at|near|,)\\s*${escapedLoc}.*`, 'i'), '');
  }
  if (city && city.length > 2) {
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\s*(?:in|at|near|,)\\s*${escapedCity}.*`, 'i'), '');
  }
  clean = clean.replace(/\s*(?:in|at|near|,)\s*(?:Sector\s*\d+[a-zA-Z]?|Chandigarh|Mohali|Kharar|Zirakpur|Panchkula).*$/i, '');
  clean = clean.replace(/[,–\-\s]+$/, '').trim();
  return clean || 'Comfortable Property Listing';
};

const stripConfidentialAddressDetails = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  // 1. Gali / Street / Lane with number (e.g. "Gali no.1", "Gali no 1", "Street no. 2", "Lane 3")
  cleaned = cleaned.replace(/\b(?:gali|street|lane)\s*(?:no\.?|number|#)?\s*[0-9]+[a-zA-Z]?\b[,\s]*/gi, '');
  // 2. Road with number (e.g. "Road no. 5" or "Road #2", keeping "Airport Road" intact)
  cleaned = cleaned.replace(/\broad\s*(?:no\.?|number|#)\s*[0-9]+[a-zA-Z]?\b[,\s]*/gi, '');
  // 3. House / Flat / Plot / Kothi / Villa / Shop / Booth / Cabin with number (e.g. "H.No. 4031", "House no 12", "Flat 204")
  cleaned = cleaned.replace(/\b(?:house|h\.?no\.?|h-no|flat|plot|kothi|villa|shop|booth|cabin)\s*(?:no\.?|number|#)?\s*[0-9]+[a-zA-Z\-/]*\b[,\s]*/gi, '');
  // 4. Room no. X (preserve general "1 room" or "room without kitchen", only remove "room no. 101" etc.)
  cleaned = cleaned.replace(/\broom\s*(?:no\.?|number|#)\s*[0-9]+[a-zA-Z\-/]*\b[,\s]*/gi, '');
  // 5. Leading or standalone house numbers like '4031, sector 68' or '#4031, sector 68'
  cleaned = cleaned.replace(/^#?\s*[0-9]{1,5}[a-zA-Z]?\s*,\s*/i, '');
  cleaned = cleaned.replace(/(?:^|\s)#\s*[0-9]{1,5}[a-zA-Z]?(?:\s*,\s*|\s+)/gi, ' ');
  // 6. Cleanup commas and horizontal whitespace (PRESERVE NEWLINES FOR BULLET POINTS)
  cleaned = cleaned.replace(/,\s*,+/g, ',');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  cleaned = cleaned.replace(/^[\s,–\-]+/, '').replace(/[\s,–\-]+$/, '').trim();
  return cleaned;
};

const formatDescriptionPoints = (desc?: string | null): string => {
  if (!desc) return '';
  let res = String(desc).replace(/\r\n/g, '\n');
  res = res.replace(/(?:^|\n|[ \t]+)[•●▪][ \t]*/g, '\n• ');
  res = res.replace(/(?:^|\n)[ \t]*[\-\*][ \t]+/g, '\n• ');
  res = res.replace(/\n{3,}/g, '\n\n');
  return res.replace(/^\n+/, '').trim();
};

const VALID_CITIES = ['Chandigarh', 'Mohali', 'Kharar', 'Zirakpur', 'Panchkula'] as const;
type ValidCity = (typeof VALID_CITIES)[number];

const normalizeCity = (rawCity?: string, rawLocality?: string, rawText?: string): ValidCity => {
  const combined = `${rawCity || ''} ${rawLocality || ''} ${rawText || ''}`.toLowerCase();
  if (combined.includes('kharar') || combined.includes('sunny enclave') || combined.includes('chajju majra') || combined.includes('gillco') || combined.includes('landran') || /sector\s*12[0-7]\b/i.test(combined)) {
    return 'Kharar';
  }
  if (combined.includes('zirakpur') || combined.includes('vip road') || combined.includes('dhakoli') || combined.includes('peer muchalla') || combined.includes('baltana') || combined.includes('gazipur')) {
    return 'Zirakpur';
  }
  if (combined.includes('panchkula') || combined.includes('mdc') || combined.includes('mansa devi') || combined.includes('pinjore') || combined.includes('kalka')) {
    return 'Panchkula';
  }
  if (combined.includes('mohali') || combined.includes('sas nagar') || combined.includes('phase ') || combined.includes('aerocity') || combined.includes('it city') || /sector\s*(?:6[6-9]|[7-9]\d|1[01]\d)\b/i.test(combined)) {
    return 'Mohali';
  }
  if (combined.includes('nayagaon') || combined.includes('kansal') || combined.includes('chandigarh') || combined.includes('dhanas') || combined.includes('manimajra') || /sector\s*(?:[1-9]|[1-5]\d|6[0-3])\b/i.test(combined)) {
    return 'Chandigarh';
  }
  const matched = VALID_CITIES.find(c => c.toLowerCase() === (rawCity || '').toLowerCase().trim());
  return matched || 'Chandigarh';
};

const ensureCityInAddress = (addr: string, city: string): string => {
  if (!addr) return city;
  const trimmed = addr.trim();
  const lowerAddr = trimmed.toLowerCase();
  const lowerCity = city.toLowerCase();
  if (new RegExp('\\b' + lowerCity + '\\b', 'i').test(lowerAddr)) {
    return trimmed;
  }
  return `${trimmed.replace(/[,–\-\s]+$/, '')}, ${city}`;
};

const extractVerifiedAreaSqFt = (rawText: string): number | null => {
  if (!rawText) return null;
  const unitMatch = rawText.match(/(\d{2,5})\s*(?:sq\s*ft|sqft|sq\.ft|square\s*feet|sq\s*meter|sqm|gaj|yards)/i);
  const keywordMatch = rawText.match(/(?:area|carpet\s*area|super\s*area|size)\s*[:\-]?\s*(\d{2,5})/i);
  if (unitMatch) {
    const num = parseInt(unitMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  if (keywordMatch) {
    const num = parseInt(keywordMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
};

const COMMON_AMENITIES = [
  'Bed', 'Box Bed', 'Sofa Set', 'AC', 'Almirah', '5G WiFi', 'Fridge',
  'Inverter Backup', 'RO Water Purifier', 'Geyser', 'Desert Cooler',
  'Induction', 'Kitchen Access', 'Food Included', 'Washing Machine',
  'Power Backup', 'CCTV Security', 'Attached Washroom', 'Balcony',
  'TV', 'Wardrobe', 'Dining Table'
];

const SAMPLE_NOTES = `1Bhk and 2Bhk Rooms With Kitchen Ground floor 

Available For Girls, Boys, Couples and small family 

Address: Sector 68, near CP-67, Mohali 

1Bhk Prize: 15k
Security charge: 15k to be negotiable 

2Bhk Prize: 25k
Security charge: 25k to be negotiable 

Fully furnished 
Included: Fan, Box Bed, Ac Almirah, unlimited 5G wi-fi, Fridge, Inverter, Induction and including water 

Owner number 
9855038844`;

export default function QuickIngestPage() {
  const router = useRouter();
  const { showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage: 1 = Input, 2 = Review & Edit, 3 = Success
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Input Stage State
  const [rawText, setRawText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Review & Edit Stage State
  const [formData, setFormData] = useState<ExtractedData>({
    title: '',
    category: 'rent',
    type: 'flat',
    city: 'Mohali',
    locality: '',
    address: '',
    price: 10000,
    deposit: 0,
    bedrooms: 1,
    bathrooms: 1,
    areaSqFt: null,
    furnishing: 'fully-furnished',
    amenities: [],
    description: '',
    ownerName: '',
    ownerPhone: '',
    ownerRole: 'owner'
  });

  const [publishLive, setPublishLive] = useState(true);
  const [featuredListing, setFeaturedListing] = useState(false);
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedPid, setPublishedPid] = useState<string | null>(null);

  // Handle File Drop / Selection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: { file: File; preview: string }[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        newFiles.push({
          file,
          preview: URL.createObjectURL(file)
        });
      }
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const target = prev[index];
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const setCoverPhoto = (index: number) => {
    if (index === 0) return;
    setSelectedFiles((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
    showToast('Cover photo updated!');
  };

  // Run AI Extraction
  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      showToast('Please paste your listing note text first!');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch('/api/admin/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawText.trim() })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to extract details from text.');
      }

      const normalizedAmenities = Array.from(
        new Set((data.data?.amenities || []).map(normalizeAmenity))
      );
      const cleanedLoc = stripConfidentialAddressDetails(data.data?.locality || 'Sector 70') || 'Sector 70';
      const cleanedCity = normalizeCity(data.data?.city, cleanedLoc, rawText.trim());
      const cleanedAddr = ensureCityInAddress(
        stripConfidentialAddressDetails(data.data?.address || `${cleanedLoc}, ${cleanedCity}`) || `${cleanedLoc}, ${cleanedCity}`,
        cleanedCity
      );
      const cleanedDesc = formatDescriptionPoints(stripConfidentialAddressDetails(data.data?.description || ''));
      const cleanedTitle = cleanListingTitle(data.data?.title || '', cleanedLoc, cleanedCity);
      const verifiedArea = extractVerifiedAreaSqFt(rawText.trim());

      setFormData({
        ...data.data,
        title: cleanedTitle,
        locality: cleanedLoc,
        city: cleanedCity,
        address: cleanedAddr,
        description: cleanedDesc,
        areaSqFt: verifiedArea,
        amenities: normalizedAmenities
      });
      setStage(2);
      showToast('✨ Note analyzed successfully! Please review the details below.');
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractError(err.message || 'Error extracting listing details.');
      showToast(err.message || 'Error extracting listing details.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Convert files to base64 for upload pipeline
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Publish Listing
  const handleApproveAndPublish = async () => {
    if (!formData.title.trim()) {
      showToast('Listing title is required.');
      return;
    }
    if (!formData.city.trim() || !formData.locality.trim()) {
      showToast('City and Locality are required.');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      showToast('Valid price is required.');
      return;
    }
    if (!formData.ownerPhone.trim()) {
      showToast('Owner phone number is required.');
      return;
    }

    setIsPublishing(true);

    try {
      // 1. Convert client image files to Base64 buffers for Cloudinary ingestion
      let imagePayload: string[] = [];
      if (selectedFiles.length > 0) {
        showToast('Compressing and preparing media for Cloudinary...');
        imagePayload = await Promise.all(
          selectedFiles.map((item) => fileToBase64(item.file))
        );
      }

      // 2. Post to existing Propzy properties creation route
      const payload = {
        title: formData.title,
        category: formData.category,
        type: formData.type,
        city: normalizeCity(formData.city, formData.locality, formData.address),
        locality: stripConfidentialAddressDetails(formData.locality) || formData.locality,
        address: ensureCityInAddress(
          stripConfidentialAddressDetails(formData.address) || `${formData.locality}, ${formData.city}`,
          normalizeCity(formData.city, formData.locality, formData.address)
        ),
        price: Number(formData.price),
        deposit: Number(formData.deposit) || 0,
        bedrooms: formData.bedrooms !== undefined && !isNaN(Number(formData.bedrooms)) ? Number(formData.bedrooms) : 1,
        bathrooms: Number(formData.bathrooms) || 1,
        areaSqFt: formData.areaSqFt ? Number(formData.areaSqFt) : null,
        furnishing: formData.furnishing,
        amenities: formData.amenities,
        description: formatDescriptionPoints(stripConfidentialAddressDetails(formData.description)),
        ownerName: formData.ownerName || 'Property Owner',
        ownerPhone: formData.ownerPhone,
        ownerRole: formData.ownerRole,
        verified: publishLive,
        featured: featuredListing,
        available: true,
        images: imagePayload
      };

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Failed to publish property listing.');
      }

      const createdPid = (resData.data?.pid || resData.data?._id || '').replace(/^(PZ|LR)-/i, '');
      setPublishedPid(createdPid);
      setStage(3);
      showToast(`Property PROP-ID: ${createdPid} successfully published to Propzy!`);
    } catch (pubErr: any) {
      console.error('Publish error:', pubErr);
      showToast(pubErr.message || 'Failed to publish property.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Toggle Amenity Tag
  const toggleAmenity = (amenity: string) => {
    const norm = normalizeAmenity(amenity);
    setFormData((prev) => {
      const exists = prev.amenities.some((a) => normalizeAmenity(a) === norm);
      const updated = exists
        ? prev.amenities.filter((a) => normalizeAmenity(a) !== norm)
        : [...prev.amenities, norm];
      return { ...prev, amenities: Array.from(new Set(updated.map(normalizeAmenity))) };
    });
  };

  const addCustomAmenity = () => {
    if (!customAmenityInput.trim()) return;
    const clean = normalizeAmenity(customAmenityInput.trim());
    setFormData((prev) => {
      if (prev.amenities.some(a => normalizeAmenity(a).toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      return { ...prev, amenities: Array.from(new Set([...prev.amenities, clean].map(normalizeAmenity))) };
    });
    setCustomAmenityInput('');
  };

  const handleResetAll = () => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    setRawText('');
    setStage(1);
    setPublishedPid(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950/80 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/properties"
            className="w-9 h-9 rounded-xl bg-[#0a110d] border border-emerald-950 hover:border-emerald-800 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                AI Listing Quick Ingest
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
                <Sparkles size={10} />
                <span>Gemini 1.5</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Upload photos, paste raw notes, review extracted fields, and approve live to Propzy.
            </p>
          </div>
        </div>

        {stage === 2 && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setStage(1)}
              className="px-3 py-1.5 rounded-xl bg-[#0b140f] border border-emerald-950 text-gray-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Input</span>
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 hover:bg-red-900/60 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Discard All</span>
            </button>
          </div>
        )}
      </div>

      {/* STAGE 1: INPUT & UPLOAD WORKSPACE */}
      {stage === 1 && (
        <div className="space-y-6">
          {extractError && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-900/80 text-red-200 text-xs flex items-start space-x-3">
              <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Extraction Warning</p>
                <p className="text-red-300/90 leading-relaxed">{extractError}</p>
                {extractError.includes('GEMINI_API_KEY') && (
                  <p className="text-[11px] text-gray-300 mt-1">
                    Tip: Add <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-300">GEMINI_API_KEY=your_key</code> in your <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-300">.env.local</code> file and restart the dev server.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Media Dropzone */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <ImageIcon size={14} className="text-emerald-400" />
                  <span>Property Photos & Videos</span>
                </label>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
                </span>
              </div>

              {/* Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-emerald-900/80 hover:border-emerald-500/80 bg-[#070d09] hover:bg-[#09140e] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud size={28} />
                </div>
                <p className="text-sm font-bold text-white mb-1">
                  Drag & Drop property photos or click to browse
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  Upload multiple room angles, kitchen, washroom, and exterior photos. JPG, PNG, WebP or MP4.
                </p>
              </div>

              {/* Thumbnails Strip */}
              {selectedFiles.length > 0 && (
                <div className="bg-[#0a110d] border border-emerald-950 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1 border-b border-emerald-950/60">
                    <span>Attached Gallery (First photo is Cover)</span>
                    <button
                      type="button"
                      onClick={() => {
                        selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
                        setSelectedFiles([]);
                      }}
                      className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {selectedFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden aspect-video bg-black border border-emerald-950"
                      >
                        {item.file.type.startsWith('video/') ? (
                          <video src={item.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.preview} alt="Room" className="w-full h-full object-cover" />
                        )}

                        {idx === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow">
                            Cover
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCoverPhoto(idx);
                              }}
                              title="Set as Cover photo"
                              className="p-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500"
                            >
                              Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            title="Delete"
                            className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Raw Listing Notes */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText size={14} className="text-emerald-400" />
                    <span>Raw Listing Notes</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_NOTES)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Paste Example Note
                  </button>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={14}
                  placeholder={`Paste raw WhatsApp or broker notes here...\n\nExample:\n"1Bhk and 2Bhk Rooms With Kitchen Ground floor\nAvailable For Girls, Boys, Couples and small family\nAddress: 4031, sector 68, near CP-67, mohali\n1Bhk Prize: 15k, Security charge: 15k to be negotiable\n2Bhk Prize: 25k\nFully furnished with Bed, AC, Wi-Fi, Fridge\nOwner: 9855038844"`}
                  className="w-full p-4 bg-[#070d09] border border-emerald-950 focus:border-emerald-500 rounded-3xl text-xs text-white placeholder-gray-500 focus:outline-none leading-relaxed font-mono shadow-inner"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isExtracting || !rawText.trim()}
                onClick={handleAnalyze}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin text-black" />
                    <span>Analyzing with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-black" />
                    <span>Analyze & Review Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: INTERACTIVE REVIEW & EDIT SCREEN */}
      {stage === 2 && (
        <div className="space-y-6 animate-fade-in">
          {/* Status Alert */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>Pre-Flight Review:</strong> All fields below have been pre-filled from your note. You can edit any numbers, terms, or tags before publishing.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700/80">
              Draft Mode
            </span>
          </div>

          {/* Photo Strip in Review */}
          {selectedFiles.length > 0 && (
            <div className="bg-[#0a110d] border border-emerald-950/90 rounded-3xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300 font-bold">
                <span>Attached Photos ({selectedFiles.length})</span>
                <span className="text-[11px] text-gray-400 font-normal">Click 'Cover' to set primary photo, or '✕' to remove</span>
              </div>
              <div className="flex items-center space-x-3 overflow-x-auto pb-2 pt-1">
                {selectedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative shrink-0 w-36 h-24 rounded-xl overflow-hidden bg-black border border-emerald-950 group"
                  >
                    <img src={item.preview} alt="Room" className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow">
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => setCoverPhoto(idx)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold"
                        >
                          Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded bg-red-600 hover:bg-red-500 text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Editable Form */}
          <div className="bg-[#0a110d] border border-emerald-950/90 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Listing Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category, Type, City, Locality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="rent">Rent</option>
                  <option value="pg">PG</option>
                  <option value="buy">Buy / Sell</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Property Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="flat">Flat / Apartment</option>
                  <option value="house">Independent House / Floor</option>
                  <option value="pg">PG Room</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  City
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setFormData((prev) => {
                      const oldCity = prev.city;
                      let newAddr = prev.address;
                      if (oldCity && newAddr.toLowerCase().endsWith(oldCity.toLowerCase())) {
                        newAddr = newAddr.slice(0, -oldCity.length) + newCity;
                      } else if (!new RegExp(`\\b${newCity}\\b`, 'i').test(newAddr)) {
                        newAddr = newAddr ? `${newAddr.replace(/[,–\-\s]+$/, '')}, ${newCity}` : `${prev.locality || 'Sector 70'}, ${newCity}`;
                      }
                      return { ...prev, city: newCity, address: newAddr };
                    });
                  }}
                  className="w-full px-3 py-2.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Mohali">Mohali</option>
                  <option value="Kharar">Kharar</option>
                  <option value="Zirakpur">Zirakpur</option>
                  <option value="Panchkula">Panchkula</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Locality / Sector
                </label>
                <input
                  type="text"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  placeholder="e.g. Sector 68"
                  className="w-full px-3 py-2.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Full Address & Landmark
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Price & Deposit (Strict Numbers) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#050806] border border-emerald-950">
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Rent / Price (₹) *
                </label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a110d] border border-emerald-900/80 rounded-xl text-sm font-extrabold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-gray-500">Pure integer only (e.g. 15000)</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Security Deposit (₹) *
                </label>
                <input
                  type="number"
                  value={formData.deposit ?? 0}
                  onChange={(e) => setFormData({ ...formData, deposit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a110d] border border-emerald-900/80 rounded-xl text-sm font-extrabold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-gray-500">Amount only. Terms in description</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Bedrooms
                </label>
                <select
                  value={formData.bedrooms}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      bedrooms: val,
                      ...(val === 0 && prev.category === 'rent' ? { category: 'pg', type: 'pg' } : {})
                    }));
                  }}
                  className="w-full px-3 py-2 bg-[#0a110d] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={0}>PG</option>
                  <option value={0.5}>1 RK</option>
                  <option value={1}>1 BHK</option>
                  <option value={2}>2 BHK</option>
                  <option value={3}>3 BHK</option>
                  <option value={4}>4+ BHK</option>
                </select>
                <span className="text-[10px] text-gray-500">Base listing unit</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Carpet Area (SqFt)
                </label>
                <input
                  type="number"
                  value={formData.areaSqFt || ''}
                  onChange={(e) => setFormData({ ...formData, areaSqFt: e.target.value ? Number(e.target.value) : null })}
                  placeholder="e.g. 900"
                  className="w-full px-3 py-2 bg-[#0a110d] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-gray-500">Optional</span>
              </div>
            </div>

            {/* Furnishing & Description */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Furnishing Status
                </label>
                <div className="flex space-x-2">
                  {(['fully-furnished', 'semi-furnished', 'unfurnished'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFormData({ ...formData, furnishing: status })}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formData.furnishing === status
                          ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                          : 'bg-[#050806] text-gray-400 hover:text-white border border-emerald-950'
                      }`}
                    >
                      {status === 'fully-furnished' ? 'Fully Furnished' : status === 'semi-furnished' ? 'Semi Furnished' : 'Unfurnished'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Formatted Description (Catch-All for Extra Units & Terms)</span>
                  <span className="text-[10px] text-gray-500 font-normal">Editable</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3.5 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>
            </div>

            {/* Amenities Tag Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Tag size={13} className="text-emerald-400" />
                <span>Amenities Badges ({formData.amenities.length} selected)</span>
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                {Array.from(new Set([...COMMON_AMENITIES, ...formData.amenities.map(normalizeAmenity)])).map((amenity) => {
                  const isSelected = formData.amenities.some(a => normalizeAmenity(a) === amenity);
                  const isCustom = !COMMON_AMENITIES.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                          : 'bg-[#050806] text-gray-400 hover:text-white border border-emerald-950/80'
                      }`}
                    >
                      {isSelected ? <Check size={12} className="text-emerald-400" /> : <Plus size={12} className="opacity-40" />}
                      <span>{amenity}</span>
                      {isCustom && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({
                              ...prev,
                              amenities: prev.amenities.filter(a => a !== amenity)
                            }));
                          }}
                          className="ml-1 text-gray-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                          title="Remove custom amenity"
                        >
                          <X size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Amenity Tag */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={customAmenityInput}
                  onChange={(e) => setCustomAmenityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAmenity();
                    }
                  }}
                  placeholder="Add custom amenity..."
                  className="px-3 py-1.5 bg-[#050806] border border-emerald-950 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 w-48"
                />
                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="px-3 py-1.5 rounded-xl bg-[#0b140f] border border-emerald-900 text-emerald-400 hover:bg-emerald-950 text-xs font-bold cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            </div>

            {/* Owner Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-emerald-950/60">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1">
                  <User size={12} className="text-emerald-400" />
                  <span>Owner Name</span>
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1">
                  <Phone size={12} className="text-emerald-400" />
                  <span>Owner Phone (10 digits) *</span>
                </label>
                <input
                  type="text"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  placeholder="e.g. 9855038844"
                  className="w-full px-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Contact Role
                </label>
                <select
                  value={formData.ownerRole}
                  onChange={(e: any) => setFormData({ ...formData, ownerRole: e.target.value })}
                  className="w-full px-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="owner">Direct Owner</option>
                  <option value="agent">Broker / Agent</option>
                </select>
              </div>
            </div>

            {/* Publishing Settings Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-emerald-950/60 text-xs text-gray-300">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={publishLive}
                  onChange={(e) => setPublishLive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:outline-none bg-[#050806] border-emerald-900"
                />
                <span className="font-bold text-white">Publish Live Immediately (verified = true)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={featuredListing}
                  onChange={(e) => setFeaturedListing(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:outline-none bg-[#050806] border-emerald-900"
                />
                <span>Feature on Homepage</span>
              </label>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-emerald-950/80">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#050806] border border-emerald-950 hover:bg-[#0c1610] text-gray-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Back to Note
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={handleApproveAndPublish}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin text-black" />
                    <span>Uploading & Publishing to Propzy...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="text-black" />
                    <span>Approve & Publish Live</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: SUCCESS CONFIRMATION */}
      {stage === 3 && (
        <div className="bg-[#0a110d] border border-emerald-800/80 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Listing Published Successfully!</h2>
            <p className="text-xs text-gray-300">
              Property listing has been created in MongoDB, photos are stored in Cloudinary, and the cache has been updated.
            </p>
            {publishedPid && (
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
                PROP-ID: {publishedPid?.replace(/^(PZ|LR)-/i, '')}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              Ingest Another Property
            </button>

            <Link
              href={`/admin/properties?pid=${publishedPid || ''}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#050806] border border-emerald-900 text-gray-200 hover:text-white text-xs font-bold transition-colors text-center"
            >
              View in Property Manager
            </Link>

            <Link
              href="/properties"
              target="_blank"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#050806] border border-emerald-900 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1 transition-colors text-center"
            >
              <span>View Public Feed</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
