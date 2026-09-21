'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, PlusCircle, Building2, MapPin, Check, CheckCircle2, Upload, X, Image as ImageIcon, Plus, Trash2, Camera, Clock, AlertTriangle, Loader2, RotateCw, Video, Play, Sparkles, Edit3 } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { LazyImage } from '@/components/LazyImage';
import { BrandSpinner } from '@/components/Loader';
import { sanitizeName, sanitizePhone, isValidName, isValidPhone } from '@/lib/validation';
import { formatPrice } from '@/lib/format';


function PostPropertyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPid = searchParams.get('edit') || searchParams.get('id') || '';
  const isEditMode = Boolean(editPid);

  const { showToast, user, setUser, openAuthModal } = useApp();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdProperty, setCreatedProperty] = useState<any>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [editUnauthorized, setEditUnauthorized] = useState(false);
  const [initialLoadedPid, setInitialLoadedPid] = useState('');

  // Form State
  const [category, setCategory] = useState<'rent' | 'sell' | 'buy' | 'pg' | 'commercial'>('rent');
  const [type, setType] = useState<'flat' | 'house' | 'pg' | 'commercial'>('flat');
  const [commercialSubType, setCommercialSubType] = useState<string>('Office Space');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Mohali');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState<string | number>('12000');
  const [deposit, setDeposit] = useState<string | number>('12000');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [areaSqFt, setAreaSqFt] = useState<number | ''>('');
  const [furnishing, setFurnishing] = useState<'unfurnished' | 'semi-furnished' | 'fully-furnished'>('semi-furnished');
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Inverter', 'AC', 'Cooler', 'Kitchen'
  ]);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [newAmenityInput, setNewAmenityInput] = useState('');
  const [isAddingCustomAmenity, setIsAddingCustomAmenity] = useState(false);

  const isCommercial = category === 'commercial' || type === 'commercial';
  // Images State & Upload Handlers
  interface UploadQueueItem {
    id: string;
    name: string;
    previewUrl: string;
    status: 'uploading' | 'success' | 'error';
    progress: number;
    errorMessage?: string;
    file?: File;
  }

  const [images, setImages] = useState<string[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'url'>('file');

  // Video State & Upload Handlers
  const [videos, setVideos] = useState<string[]>([]);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTab, setVideoTab] = useState<'file' | 'url'>('file');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const isUploadingImages = uploadQueue.some(item => item.status === 'uploading');

  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [ownerPhone, setOwnerPhone] = useState(user?.phone || '');

  React.useEffect(() => {
    if (!isEditMode) {
      if (user?.name && !ownerName) setOwnerName(user.name);
      if (user?.phone && !ownerPhone) setOwnerPhone(user.phone);
    }
  }, [user?.name, user?.phone, isEditMode, ownerName, ownerPhone]);

  // Fetch listing details if in Edit Mode
  React.useEffect(() => {
    if (!isEditMode || !editPid) {
      setLoadingEdit(false);
      return;
    }
    let isMounted = true;
    setLoadingEdit(true);
    setEditUnauthorized(false);

    fetch(`/api/properties/${editPid}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.data) {
          const prop = data.data;
          const isAuthorized = user?.role === 'admin' || (user?.email && prop.ownerEmail && user.email.toLowerCase() === prop.ownerEmail.toLowerCase());
          if (!isAuthorized && user) {
            setEditUnauthorized(true);
            setLoadingEdit(false);
            return;
          }

          if (prop.category) setCategory(prop.category);
          if (prop.type) setType(prop.type);
          if (prop.commercialSubType) setCommercialSubType(prop.commercialSubType);
          if (prop.title) setTitle(prop.title);
          if (prop.city) setCity(prop.city);
          if (prop.locality) setLocality(prop.locality);
          if (prop.address) setAddress(prop.address);
          if (typeof prop.price !== 'undefined') setPrice(prop.price);
          if (typeof prop.deposit !== 'undefined') setDeposit(prop.deposit);
          if (typeof prop.bedrooms !== 'undefined') setBedrooms(prop.bedrooms);
          if (typeof prop.bathrooms !== 'undefined') setBathrooms(prop.bathrooms);
          if (typeof prop.areaSqFt === 'number' && prop.areaSqFt > 0) setAreaSqFt(prop.areaSqFt);
          else setAreaSqFt('');
          if (prop.furnishing) setFurnishing(prop.furnishing);
          if (prop.description) setDescription(prop.description);
          if (Array.isArray(prop.amenities)) setSelectedAmenities(prop.amenities);
          if (Array.isArray(prop.images)) setImages(prop.images);
          if (Array.isArray(prop.videos)) setVideos(prop.videos);
          if (prop.ownerName) setOwnerName(prop.ownerName);
          if (prop.ownerPhone) setOwnerPhone(prop.ownerPhone);
          setInitialLoadedPid(prop.pid || editPid);
        } else {
          showToast(data.message || 'Could not find property to edit', 'error');
        }
        setLoadingEdit(false);
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load property for edit:', err);
          showToast('Failed to load property data for editing', 'error');
          setLoadingEdit(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isEditMode, editPid, user]);

  const postPropertyChannelRef = React.useRef<BroadcastChannel | null>(null);
  const draftSyncLockedRef = React.useRef(false);
  const draftHydratedRef = React.useRef(false);

  const POST_PROPERTY_DRAFT_KEY = 'propzy_post_property_draft_v2';
  const POST_PROPERTY_SUBMISSION_KEY = 'propzy_post_property_submission_v2';

  type PostPropertyTextDraft = {
    step: number;
    category: 'rent' | 'sell' | 'buy' | 'pg' | 'commercial';
    type: 'flat' | 'house' | 'pg' | 'commercial';
    commercialSubType?: string;
    title: string;
    city: string;
    locality: string;
    address: string;
    price: string | number;
    deposit: string | number;
    bedrooms: number;
    bathrooms: number;
    areaSqFt: number | '';
    furnishing: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
    description: string;
    selectedAmenities: string[];
    urlInput: string;
    uploadTab: 'file' | 'url';
    ownerName: string;
    ownerPhone: string;
  };

  const createSubmissionSignature = (draft: Pick<PostPropertyTextDraft, 'category' | 'type' | 'title' | 'city' | 'locality' | 'address' | 'price' | 'deposit' | 'bedrooms' | 'bathrooms' | 'areaSqFt' | 'furnishing' | 'description' | 'selectedAmenities' | 'urlInput' | 'uploadTab' | 'ownerName' | 'ownerPhone'>, imagesList: string[]) => {
    const source = JSON.stringify({
      ...draft,
      selectedAmenities: [...draft.selectedAmenities].sort(),
      images: imagesList,
    });

    let hash = 5381;
    for (let index = 0; index < source.length; index += 1) {
      hash = ((hash << 5) + hash) + source.charCodeAt(index);
    }

    return `${hash >>> 0}`;
  };

  const readTextDraft = (): PostPropertyTextDraft => ({
    step,
    category,
    type,
    commercialSubType,
    title,
    city,
    locality,
    address,
    price,
    deposit,
    bedrooms,
    bathrooms,
    areaSqFt,
    furnishing,
    description,
    selectedAmenities,
    urlInput,
    uploadTab,
    ownerName,
    ownerPhone,
  });

  const applyTextDraft = (draft: Partial<PostPropertyTextDraft>) => {
    if (typeof draft.step === 'number') setStep(draft.step);
    if (draft.category) setCategory(draft.category);
    if (draft.type) setType(draft.type);
    if (typeof draft.commercialSubType === 'string') setCommercialSubType(draft.commercialSubType || 'Office Space');
    if (typeof draft.title === 'string') setTitle(draft.title || '');
    if (typeof draft.city === 'string') setCity(draft.city || 'Mohali');
    if (typeof draft.locality === 'string') setLocality(draft.locality || '');
    if (typeof draft.address === 'string') setAddress(draft.address || '');
    if (typeof draft.price !== 'undefined') setPrice(draft.price ?? '12000');
    if (typeof draft.deposit !== 'undefined') setDeposit(draft.deposit ?? '12000');
    if (typeof draft.bedrooms === 'number') setBedrooms(draft.bedrooms);
    if (typeof draft.bathrooms === 'number') setBathrooms(draft.bathrooms ?? 1);
    if (typeof draft.areaSqFt === 'number' || draft.areaSqFt === '') setAreaSqFt(draft.areaSqFt);
    if (draft.furnishing) setFurnishing(draft.furnishing);
    if (typeof draft.description === 'string') setDescription(draft.description || '');
    if (Array.isArray(draft.selectedAmenities)) setSelectedAmenities(draft.selectedAmenities);
    if (typeof draft.urlInput === 'string') setUrlInput(draft.urlInput || '');
    if (draft.uploadTab) setUploadTab(draft.uploadTab);
    if (typeof draft.ownerName === 'string') setOwnerName(draft.ownerName || '');
    if (typeof draft.ownerPhone === 'string') setOwnerPhone(draft.ownerPhone || '');
  };

  const readImageDraft = () => images;

  const isVerifiedOwner = Boolean(
    user &&
    user.role === 'owner' &&
    (user.ownerVerified || user.verificationStatus === 'approved')
  );

  const syncedProfileRef = React.useRef(false);

  React.useEffect(() => {
    if (user?.email && !syncedProfileRef.current) {
      syncedProfileRef.current = true;
      fetch('/api/user/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            if (
              user.verificationStatus !== data.user.verificationStatus ||
              user.ownerVerified !== data.user.ownerVerified ||
              user.role !== data.user.role
            ) {
              setUser({ ...user, ...data.user });
            }
          }
        })
        .catch(() => { });
    }
  }, [user]);

  const residentialAmenities = [
    'Inverter', 'AC', 'Cooler', 'Kitchen',
    'Fan', 'Balcony', 'Geyser', 'Washing Machine', 'Fridge', 'Almirah',
    'TV', 'RO Water', 'Bed', 'Sofa Set'
  ];

  const commercialAmenities = [
    'Power Backup', 'Central AC', 'Car Parking', 'Visitor Parking',
    'High-Speed Wi-Fi', 'Elevator / Lift', 'Conference Room', 'Pantry Area',
    'Fire Safety', 'CCTV & Security', 'Reception Area', '24/7 Access',
    'Cafeteria / Food Court', 'Reserved Parking'
  ];

  const baseAmenities = isCommercial ? commercialAmenities : residentialAmenities;
  const allAvailableAmenities = Array.from(new Set([...baseAmenities, ...customAmenities, ...selectedAmenities]));

  const maxSellImages = 10;
  const maxImagesReached = images.length >= maxSellImages;

  const normalizeImageUrl = (input: string): string => {
    let url = input.trim();
    if (!url) return '';
    if (url.startsWith('//')) url = 'https:' + url;

    // Unsplash web page URL -> direct download / CDN URL
    if (url.includes('unsplash.com/photos/')) {
      try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const lastSeg = pathSegments[pathSegments.length - 1];
        if (lastSeg) {
          const tokens = lastSeg.split('-');
          const photoId = tokens[tokens.length - 1] || lastSeg;
          const cleanId = photoId.replace(/^photo-/, '');
          return `https://images.unsplash.com/photo-${cleanId}?auto=format&fit=crop&w=1200&q=80`;
        }
      } catch {}
    }

    // Google Drive & Google Usercontent
    if (
      url.includes('drive.google.com') ||
      url.includes('drive.usercontent.google.com') ||
      url.includes('googleusercontent.com')
    ) {
      const idMatch =
        url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
        url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
      }
    }

    // Dropbox
    if (url.includes('dropbox.com') && url.includes('dl=0')) {
      return url.replace('dl=0', 'raw=1');
    }

    return url;
  };

  const validateImageSource = (src: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (!src || (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:image/'))) {
        resolve(false);
        return;
      }

      const isKnownImageHost =
        src.includes('images.unsplash.com') ||
        src.includes('res.cloudinary.com') ||
        src.includes('googleusercontent.com') ||
        src.includes('drive.usercontent.google.com') ||
        src.includes('i.imgur.com') ||
        src.includes('images.pexels.com');

      const img = new window.Image();
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(isKnownImageHost || /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(src));
        }
      }, 3500);

      img.onload = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          if (isKnownImageHost || /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(src)) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      };

      img.src = src;
    });
  };

  const appendImage = (imageSrc: string) => {
    setImages(prev => {
      if (prev.length >= maxSellImages) {
        return prev;
      }
      if (prev.includes(imageSrc)) {
        return prev;
      }
      return [...prev, imageSrc].slice(0, maxSellImages);
    });
  };

  React.useEffect(() => {
    if (images.length > maxSellImages) {
      setImages(prev => prev.slice(0, maxSellImages));
      showToast(`Listings can have at most ${maxSellImages} photos`);
    }
  }, [images.length]);

  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const MAX_WIDTH = 960;
          const MAX_HEIGHT = 720;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          resolve(dataUrl);
        };
        img.onerror = () => {
          resolve(e.target?.result as string);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadSingleFileToCloudinary = async (uploadId: string, file: File) => {
    try {
      // 1. Check if Cloudinary upload signature is available from server API
      let isCloudinaryConfigured = false;
      let signData: any = null;

      try {
        const signRes = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.email,
            userId: user?.id,
            role: user?.role
          })
        });

        signData = await signRes.json();
        if (signRes.ok && signData?.success && signData?.cloudName) {
          isCloudinaryConfigured = true;
        }
      } catch (err) {
        console.warn('Cloudinary signature check skipped, falling back to local optimization');
      }

      if (isCloudinaryConfigured && signData) {
        // 2. Prepare multipart upload payload for Cloudinary API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', String(signData.timestamp));
        formData.append('signature', signData.signature);
        formData.append('folder', signData.folder);

        // 3. Upload directly from browser to Cloudinary CDN with live progress
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
              setUploadQueue(prev => prev.map(item => item.id === uploadId ? { ...item, progress: percent } : item));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resJson = JSON.parse(xhr.responseText);
                resolve(resJson);
              } catch {
                reject(new Error('Invalid response received from Cloudinary'));
              }
            } else {
              try {
                const resJson = JSON.parse(xhr.responseText);
                reject(new Error(resJson.error?.message || `Upload failed (${xhr.status})`));
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network error during photo upload.'));
          xhr.send(formData);
        });

        // 4. Remove from active upload queue & append secure URL to images
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
        appendImage(result.secure_url);
        showToast(`Photo "${file.name}" uploaded successfully!`, 'success');
      } else {
        // 4. Fallback: Fast client-side image optimization and storage
        setUploadQueue(prev => prev.map(item => item.id === uploadId ? { ...item, progress: 65 } : item));
        const optimizedDataUrl = await compressImageToDataUrl(file);
        setUploadQueue(prev => prev.map(item => item.id === uploadId ? { ...item, progress: 100 } : item));

        setTimeout(() => {
          setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
          appendImage(optimizedDataUrl);
          showToast(`Photo "${file.name}" attached successfully!`, 'success');
        }, 200);
      }
    } catch (err: any) {
      console.warn('Falling back to local image compression due to error:', err);
      try {
        const optimizedDataUrl = await compressImageToDataUrl(file);
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
        appendImage(optimizedDataUrl);
        showToast(`Photo "${file.name}" attached successfully!`, 'success');
      } catch (fallbackErr: any) {
        setUploadQueue(prev => prev.map(item =>
          item.id === uploadId ? { ...item, status: 'error', errorMessage: fallbackErr.message || 'Upload failed' } : item
        ));
        showToast(`Upload failed for ${file.name}: ${fallbackErr.message || 'Error'}`, 'error');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentTotal = images.length + uploadQueue.filter(q => q.status === 'uploading').length;
    if (currentTotal >= maxSellImages) {
      showToast(`Listings can have at most ${maxSellImages} photos`);
      e.target.value = '';
      return;
    }

    const remainingSlots = Math.max(maxSellImages - currentTotal, 0);
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      showToast(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added`);
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/avif'];

    for (const file of filesToUpload) {
      // Validate file type
      if (!VALID_IMAGE_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
        showToast(`Skipped "${file.name}": Unsupported format. Use JPG, PNG, or WEBP.`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        showToast(`Skipped "${file.name}": File size exceeds 10 MB limit.`);
        continue;
      }

      // Prevent duplicate selection by checking existing queue
      const alreadyQueued = uploadQueue.some(q => q.name === file.name && q.status === 'uploading');
      if (alreadyQueued) {
        continue;
      }

      const uploadId = 'upload_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const previewUrl = URL.createObjectURL(file);

      const queueItem: UploadQueueItem = {
        id: uploadId,
        name: file.name,
        previewUrl,
        status: 'uploading',
        progress: 0,
        file
      };

      setUploadQueue(prev => [...prev, queueItem]);
      uploadSingleFileToCloudinary(uploadId, file);
    }

    e.target.value = '';
  };

  const handleRemoveQueueItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleRetryUpload = (item: UploadQueueItem) => {
    if (!item.file) return;
    setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 0, errorMessage: undefined } : q));
    uploadSingleFileToCloudinary(item.id, item.file);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddUrl = async () => {
    if (isAddingUrl) return;
    const rawUrl = urlInput.trim();
    if (!rawUrl) {
      showToast('Please enter an image URL');
      return;
    }

    const imageUrl = normalizeImageUrl(rawUrl);

    if (images.includes(imageUrl)) {
      showToast('This image URL has already been added');
      setUrlInput('');
      return;
    }

    if (images.length >= maxSellImages) {
      showToast(`Listings can have at most ${maxSellImages} photos`);
      return;
    }

    setIsAddingUrl(true);
    try {
      const isValid = await validateImageSource(imageUrl);
      if (!isValid) {
        showToast('Could not load image. Please provide a direct image link or image CDN URL');
        return;
      }

      if (images.includes(imageUrl)) {
        showToast('This image URL has already been added');
        setUrlInput('');
        return;
      }

      if (images.length >= maxSellImages) {
        showToast(`Listings can have at most ${maxSellImages} photos`);
        return;
      }

      appendImage(imageUrl);
      setUrlInput('');
      showToast('Image added successfully!');
    } catch {
      showToast('Failed to validate image URL');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAmenity = newAmenityInput.trim();
    if (!cleanAmenity) return;

    const matched = allAvailableAmenities.find(a => a.toLowerCase() === cleanAmenity.toLowerCase());
    if (matched) {
      if (!selectedAmenities.includes(matched)) {
        setSelectedAmenities(prev => [...prev, matched]);
      }
      showToast(`"${cleanAmenity}" is already in the list and has been selected!`);
      setNewAmenityInput('');
      setIsAddingCustomAmenity(false);
      return;
    }

    setCustomAmenities(prev => [...prev, cleanAmenity]);
    setSelectedAmenities(prev => [...prev, cleanAmenity]);
    setNewAmenityInput('');
    setIsAddingCustomAmenity(false);
    showToast(`Added "${cleanAmenity}" to amenities!`);
  };

  const handleRemoveCustomAmenity = (amenityToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomAmenities(prev => prev.filter(a => a !== amenityToRemove));
    setSelectedAmenities(prev => prev.filter(a => a !== amenityToRemove));
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    const VALID_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];

    if (!VALID_VIDEO_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith('video/')) {
      showToast('Please select a valid video file (.mp4, .mov, or .webm)');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      showToast('Video exceeds 50 MB. Please upload a shorter or compressed clip.');
      e.target.value = '';
      return;
    }

    setVideoUploading(true);
    setVideoProgress(0);

    try {
      // 1. Get signed token from server API for video
      let signData: any = null;
      try {
        const signRes = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.email,
            userId: user?.id,
            role: user?.role,
            resourceType: 'video'
          })
        });
        signData = await signRes.json();
      } catch (err) {
        console.warn('Video sign check warning:', err);
      }

      if (!signData?.success || !signData?.cloudName) {
        throw new Error(signData?.message || 'Video upload signature failed');
      }

      // 2. Direct upload to Cloudinary with live progress
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', String(signData.timestamp));
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder || 'letsrentz/videos');

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            setVideoProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const resJson = JSON.parse(xhr.responseText);
              resolve(resJson);
            } catch {
              reject(new Error('Invalid response from Cloudinary'));
            }
          } else {
            try {
              const resJson = JSON.parse(xhr.responseText);
              reject(new Error(resJson.error?.message || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during video upload.'));
        xhr.send(formData);
      });

      setVideoProgress(100);
      setVideos([result.secure_url]);
      showToast(`Video "${file.name}" uploaded successfully!`, 'success');
    } catch (err: any) {
      console.error('[Video Upload Error]:', err);
      showToast(err?.message || 'Failed to upload video');
    } finally {
      setVideoUploading(false);
      e.target.value = '';
    }
  };

  const handleAddVideoUrl = () => {
    const rawUrl = videoUrlInput.trim();
    if (!rawUrl) {
      showToast('Please enter a video URL');
      return;
    }
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      showToast('Please enter a valid URL starting with https://');
      return;
    }
    setVideos([rawUrl]);
    setVideoUrlInput('');
    showToast('Video tour link added successfully!', 'success');
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || step === 4) return;
    if (!title || !locality || !price || !ownerName || !ownerPhone) {
      showToast('Please fill out all required fields');
      return;
    }

    if (!isValidName(ownerName)) {
      showToast('Please enter a valid owner name (letters only)');
      return;
    }

    if (!isValidPhone(ownerPhone)) {
      showToast('Please enter a valid 10-digit mobile phone number');
      return;
    }


    setSubmitting(true);

    const areaText = areaSqFt && Number(areaSqFt) > 0 ? `${areaSqFt} sq.ft ` : '';
    const defaultCommercialDesc = `Prime ${commercialSubType || 'commercial space'} available for ${category === 'sell' || category === 'buy' ? 'sale' : 'rent'} in ${locality}, ${city}. Features ${areaText}area with ${furnishing === 'fully-furnished' ? 'fully furnished plug & play setup' : furnishing === 'semi-furnished' ? 'semi-fitted interior' : 'bare shell layout'}. Direct owner contact.`;
    const bhkLabel = bedrooms === 0 ? 'PG' : bedrooms === 0.5 ? '1 RK' : `${bedrooms} BHK`;
    const defaultResidentialDesc = `Beautiful ${bhkLabel} ${type} available for ${category === 'sell' || category === 'buy' ? 'sale' : category} in ${locality}, ${city}. Direct owner contact.`;

    const payload = {
      title,
      category,
      type,
      city,
      locality,
      address: `${locality.trim()}, ${city.trim()}`,
      price: price ? String(price).trim() : '10000',
      deposit: deposit ? String(deposit).trim() : '0',
      bedrooms: isCommercial ? 0 : Number(bedrooms),
      bathrooms: Number(bathrooms),
      areaSqFt: areaSqFt && Number(areaSqFt) > 0 ? Number(areaSqFt) : null,
      furnishing,
      description: description || (isCommercial ? defaultCommercialDesc : defaultResidentialDesc),
      amenities: selectedAmenities,
      images: images,
      videos: videos,
      ownerName,
      ownerPhone,
      ownerEmail: user?.email || '',
      ownerRole: user?.role === 'owner' ? 'owner' : 'owner'
    };

    try {
      if (isEditMode) {
        const res = await fetch(`/api/properties/${editPid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success && data.data) {
          setCreatedProperty(data.data);
          showToast(`Property ${data.data.pid || editPid} updated successfully!`, 'success');
          setStep(4);
        } else {
          showToast(data.message || 'Failed to update property', 'error');
        }
      } else {
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          setCreatedProperty(data.data);
          showToast(`Property ${data.data.pid} posted successfully!`, 'success');
          setStep(4); // Success step
        } else {
          showToast(data.message || 'Failed to post property', 'error');
        }
      }
    } catch (err) {
      console.warn(isEditMode ? 'PATCH fallback:' : 'POST fallback:', err);
      if (isEditMode) {
        showToast('Failed to update property. Please try again.', 'error');
      } else {
        const mockProp = {
          ...payload,
          pid: `${Math.floor(100 + Math.random() * 900)}`,
          id: `prop-${Date.now()}`,
          verified: true,
          featured: false,
          available: true,
          createdAt: new Date().toISOString()
        };
        setCreatedProperty(mockProp);
        setStep(4);
        showToast('Property listed successfully!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 0. LOADING EDIT STATE
  if (loadingEdit) {
    return (
      <div className="bg-[#050806] text-gray-100 min-h-screen py-20 flex items-center justify-center">
        <BrandSpinner message={`Loading listing ${editPid}...`} size="lg" />
      </div>
    );
  }

  // 0. UNAUTHORIZED EDIT ATTEMPT
  if (editUnauthorized) {
    return (
      <div className="bg-[#050806] text-gray-100 min-h-screen py-16 flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-950/40 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-400 text-[11px] font-extrabold uppercase tracking-wider">
              Permission Denied
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">Cannot Edit This Listing</h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
              You do not have permission to edit listing <strong className="text-rose-400 font-mono">{editPid}</strong>. You can only modify property listings posted under your own account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard?tab=my-properties"
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg transition-all uppercase tracking-wider cursor-pointer text-center"
            >
              Back to My Properties
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#09110c] hover:bg-[#121c16] border border-emerald-950 text-gray-300 hover:text-white font-bold text-xs rounded-full transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. UNLOGINED / UNREGISTERED USER WARNING GATE
  if (!user) {
    return (
      <div className="bg-[#050806] text-gray-100 min-h-screen py-16 flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#0e1d14] border border-emerald-900/80 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
            <Building2 size={32} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider">
              Authentication Required
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">Login Required to Post Property</h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
              You are currently not logged in. Posting properties on PROPZY requires a registered Property Owner account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={openAuthModal}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider cursor-pointer"
            >
              Login / Sign Up to Continue
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#09110c] hover:bg-[#121c16] border border-emerald-950 text-gray-300 hover:text-white font-bold text-xs rounded-full transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. REGISTERED TENANT WARNING GATE
  if (user.role === 'tenant') {
    return (
      <div className="bg-[#050806] text-gray-100 min-h-screen py-16 flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-950/40 border border-amber-800/80 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-400 text-[11px] font-extrabold uppercase tracking-wider">
              Property Owner Account Required
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">Tenants Cannot Post Property Listings</h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
              You are currently logged in as a <strong className="text-amber-400 font-bold">Tenant ({user.name})</strong>. Posting property listings on PROPZY is reserved for Property Owners.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg transition-all uppercase tracking-wider cursor-pointer text-center"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#09110c] hover:bg-[#121c16] border border-emerald-950 text-gray-300 hover:text-white font-bold text-xs rounded-full transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050806] text-gray-100 min-h-screen py-6 sm:py-10">

      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          {isEditMode ? (
            <>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider max-w-full">
                <Edit3 size={13} className="shrink-0" />
                <span className="truncate">Editing Listing • {initialLoadedPid || editPid}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">Edit Your Property Listing</h1>
              <p className="text-xs text-gray-400 max-w-md mx-auto">Update your listing's photos, pricing, amenities, and details anytime</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider max-w-full">
                <PlusCircle size={13} className="shrink-0" />
                <span className="truncate">0% Commission • Free Property Listing</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">Post Your Property For Free</h1>
              <p className="text-xs text-gray-400 max-w-md mx-auto">Connect directly with thousands of verified tenants & buyers in Chandigarh Tricity</p>
            </>
          )}
        </div>

        {/* Form Wizard Container */}
        <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 p-4 sm:p-8 shadow-xl">
          {/* VERIFICATION BLOCK NOTICE FOR UNVERIFIED OWNERS */}
          {!isVerifiedOwner && !isEditMode && step !== 4 ? (
            <div className="bg-[#121609] border border-amber-800/80 rounded-2xl p-5 sm:p-6 text-center space-y-4 my-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-900/40 text-amber-400 flex items-center justify-center mx-auto border border-amber-700/60 shadow-lg">
                <ShieldCheck size={24} />
              </div>
              {user.verificationStatus === 'pending' ? (
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Electricity Bill Verification Under Admin Review</h3>
                  <p className="text-xs text-amber-300 max-w-md mx-auto leading-relaxed">
                    Your Electricity Bill (Consumer No: <strong className="font-mono font-bold text-white break-all">{user.consumerNumber || 'Submitted'}</strong>) is currently being reviewed by our Admin team. Once approved by Admin, your account will be authorized to post listings.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Electricity Bill Owner Verification Required</h3>
                  <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                    To prevent fake listings, only property owners verified by their <strong className="text-emerald-400">Electricity Bill & Consumer Number</strong> can post property listings on PROPZY.
                  </p>
                </div>
              )}
              <div className="pt-2 flex items-center justify-center">
                <Link
                  href="/dashboard?tab=account"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg transition-all uppercase tracking-wider cursor-pointer text-center"
                >
                  {user.verificationStatus === 'pending' ? 'Check Status in Profile' : 'Upload Electricity Bill in Profile'}
                </Link>
              </div>
            </div>
          ) : (

            <>
              {/* Progress Indicator Bar */}
              {step < 4 && (
                <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-emerald-950">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className={`flex items-center space-x-1.5 sm:space-x-2 ${step >= 1 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs shrink-0 ${step >= 1 ? 'bg-emerald-500 text-black font-extrabold' : 'bg-gray-800 text-gray-400'}`}>1</span>
                      <span className="text-[11px] sm:text-xs">Basic<span className="hidden sm:inline"> Details</span></span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step >= 2 ? 'bg-emerald-500/60' : 'bg-emerald-950'}`} />
                    <div className={`flex items-center space-x-1.5 sm:space-x-2 ${step >= 2 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs shrink-0 ${step >= 2 ? 'bg-emerald-500 text-black font-extrabold' : 'bg-gray-800 text-gray-400'}`}>2</span>
                      <span className="text-[11px] sm:text-xs">Specs<span className="hidden sm:inline"> & Amenities</span></span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step >= 3 ? 'bg-emerald-500/60' : 'bg-emerald-950'}`} />
                    <div className={`flex items-center space-x-1.5 sm:space-x-2 ${step >= 3 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs shrink-0 ${step >= 3 ? 'bg-emerald-500 text-black font-extrabold' : 'bg-gray-800 text-gray-400'}`}>3</span>
                      <span className="text-[11px] sm:text-xs">Photos<span className="hidden sm:inline"> & Contact</span></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5 sm:space-y-6 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Purpose / Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['rent', 'sell', 'pg', 'commercial'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        if (cat === 'commercial') {
                          setType('commercial');
                          setBedrooms(0);
                        } else if (cat === 'pg') {
                          setType('pg');
                          setBedrooms(0);
                        } else if (type === 'commercial' || type === 'pg') {
                          setType('flat');
                          setBedrooms(2);
                        }
                      }}
                      className={`py-2.5 cursor-pointer rounded-xl font-bold uppercase transition-all border ${category === cat
                        ? 'bg-emerald-500 text-black border-emerald-500 shadow-md'
                        : 'bg-[#050806] text-gray-400 border-emerald-950 hover:text-white'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">Property Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['flat', 'house', 'pg', 'commercial'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        if (t === 'commercial') {
                          setBedrooms(0);
                        } else if (t === 'pg') {
                          setCategory('pg');
                          setBedrooms(0);
                        } else if (category === 'commercial' || category === 'pg') {
                          setCategory('rent');
                          setBedrooms(2);
                        }
                      }}
                      className={`py-2.5 rounded-xl font-bold uppercase transition-all border ${type === t
                        ? 'bg-emerald-500 text-black border-emerald-500 shadow-md'
                        : 'bg-[#050806] text-gray-400 border-emerald-950 hover:text-white'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Property Listing Title *</label>
                <input
                  type="text"
                  required
                  value={title ?? ''}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isCommercial ? "e.g. Furnished Commercial Office Space in Sector 67" : "e.g. Spacious 2BHK Apartment with Balcony in Sector 70"}
                  className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">City *</label>
                  <select
                    value={city ?? 'Mohali'}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Mohali" className="bg-[#0a110d] text-white">Mohali</option>
                    <option value="Chandigarh" className="bg-[#0a110d] text-white">Chandigarh</option>
                    <option value="Kharar" className="bg-[#0a110d] text-white">Kharar</option>
                    <option value="Zirakpur" className="bg-[#0a110d] text-white">Zirakpur</option>
                    <option value="Panchkula" className="bg-[#0a110d] text-white">Panchkula</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Locality / Sector *</label>
                  <input
                    type="text"
                    required
                    value={locality ?? ''}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="e.g. Sector 70 or Aerocity"
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    {category === 'sell' || category === 'buy' ? 'Expected Sale Price (₹) *' : isCommercial ? 'Monthly Rent (₹) *' : 'Monthly Rent (₹) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={price ?? ''}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9,\-\s]/g, ''))}
                    placeholder="e.g. 20000 or 20000-21000"
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none font-bold"
                  />
                  {price && String(price).trim() ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                      <span>Preview:</span>
                      <span className="font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-900/60 px-2 py-0.5 rounded whitespace-nowrap">
                        {formatPrice(price)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Security Deposit (₹)</label>
                  <input
                    type="text"
                    value={deposit ?? ''}
                    onChange={(e) => setDeposit(e.target.value.replace(/[^0-9,\-\s]/g, ''))}
                    placeholder="e.g. 20000 or 20000-21000"
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none font-bold"
                  />
                  {deposit && String(deposit).trim() ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                      <span>Preview:</span>
                      <span className="font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-900/60 px-2 py-0.5 rounded whitespace-nowrap">
                        {formatPrice(deposit)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!title || !locality || !String(price).trim()) {
                    showToast('Please enter title, locality, and price');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-3.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Next Step: Specifications →
              </button>
            </div>
          )}

          {/* STEP 2: Specs & Amenities */}
          {step === 2 && (
            <div className="space-y-5 sm:space-y-6 text-xs">
              <div className={isCommercial ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"}>
                {isCommercial ? (
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Commercial Space Type</label>
                    <select
                      value={commercialSubType}
                      onChange={(e) => setCommercialSubType(e.target.value)}
                      className="w-full px-3.5 py-3 pr-9 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer font-medium text-xs sm:text-sm"
                    >
                      <option value="Office Space">Office Space</option>
                      <option value="Shop / Retail">Shop / Retail Store</option>
                      <option value="Showroom">Showroom</option>
                      <option value="Warehouse / Godown">Warehouse / Godown</option>
                      <option value="Coworking Space">Coworking Space</option>
                      <option value="Commercial Building">Commercial Building</option>
                      <option value="Other Commercial">Other Commercial</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Bedrooms (BHK)</label>
                    <select
                      value={bedrooms}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBedrooms(val);
                        if (val === 0 && category === 'rent') {
                          setCategory('pg');
                          setType('pg');
                        }
                      }}
                      className="w-full px-3.5 py-3 pr-9 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer text-xs sm:text-sm"
                    >
                      <option value={0}>PG</option>
                      <option value={0.5}>1 RK</option>
                      <option value={1}>1 BHK</option>
                      <option value={2}>2 BHK</option>
                      <option value={3}>3 BHK</option>
                      <option value={4}>4 BHK+</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    {isCommercial ? 'Washrooms' : 'Bathrooms'}
                  </label>
                  <select
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full px-3.5 py-3 pr-9 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer text-xs sm:text-sm font-medium"
                  >
                    {isCommercial ? (
                      <>
                        <option value={0}>0 (Shared / Common)</option>
                        <option value={1}>1 Private Washroom</option>
                        <option value={2}>2 Private Washrooms</option>
                        <option value={3}>3+ Private Washrooms</option>
                      </>
                    ) : (
                      <>
                        <option value={1}>1 Bath</option>
                        <option value={2}>2 Baths</option>
                        <option value={3}>3 Baths+</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    {isCommercial ? 'Super Area (sq.ft)' : 'Area (sq.ft)'}
                  </label>

                  <input
                    type="number"
                    value={areaSqFt ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value.length <= 8) {
                        setAreaSqFt(value ? Number(value) : '');
                      }
                    }}
                    placeholder={isCommercial ? "e.g. 1500" : "e.g. 1100"}
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none font-bold text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    {isCommercial ? 'Fit-out / Furnishing' : 'Furnishing Status'}
                  </label>
                  <select
                    value={furnishing}
                    onChange={(e) => setFurnishing(e.target.value as 'unfurnished' | 'semi-furnished' | 'fully-furnished')}
                    className="w-full px-3.5 py-3 pr-9 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer text-xs sm:text-sm font-medium"
                  >
                    <option value="unfurnished">{isCommercial ? 'Bare Shell (Unfurnished)' : 'Unfurnished'}</option>
                    <option value="semi-furnished">{isCommercial ? 'Semi-Fitted (Warm Shell)' : 'Semi-Furnished'}</option>
                    <option value="fully-furnished">{isCommercial ? 'Fully Furnished (Plug & Play)' : 'Fully Furnished'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  {isCommercial ? 'Select Commercial Amenities & Facilities' : 'Select Amenities Available'}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allAvailableAmenities.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity);
                    const isCustom = customAmenities.includes(amenity) || (!baseAmenities.includes(amenity));

                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-2.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-[#0e261a] text-emerald-400 border-emerald-700/80 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-[#050806] text-gray-400 border-emerald-950 hover:text-white hover:border-emerald-900'
                        }`}
                      >
                        <span className="truncate pr-1 flex items-center space-x-1.5">
                          <span>{amenity}</span>
                          {isCustom && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                              custom
                            </span>
                          )}
                        </span>
                        <div className="flex items-center space-x-1 shrink-0">
                          {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                          {isCustom && (
                            <span
                              onClick={(e) => handleRemoveCustomAmenity(amenity, e)}
                              title="Remove custom amenity"
                              className="text-gray-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                            >
                              <X size={12} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* "+ Add More Amenities" Button placed right after all amenities in grid */}
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomAmenity(prev => !prev)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between border border-dashed transition-all cursor-pointer ${
                      isAddingCustomAmenity
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-md'
                        : 'bg-[#06170e]/80 hover:bg-[#0c2719] text-emerald-400 hover:text-emerald-300 border-emerald-700/80 hover:border-emerald-500'
                    }`}
                  >
                    <span className="truncate pr-1 flex items-center space-x-1.5">
                      <Plus size={14} className="stroke-[2.5] text-emerald-400 shrink-0" />
                      <span>Add More Amenities</span>
                    </span>
                  </button>
                </div>

                {/* Add Custom Amenity Input Bar */}
                {isAddingCustomAmenity && (
                  <form
                    onSubmit={handleAddCustomAmenity}
                    className="mt-3 p-3 rounded-2xl bg-[#06140c] border border-emerald-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in duration-200"
                  >
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newAmenityInput}
                        onChange={(e) => setNewAmenityInput(e.target.value)}
                        placeholder="e.g. Microwave, Swimming Pool, Study Table, Sofa..."
                        autoFocus
                        maxLength={35}
                        className="w-full px-3.5 py-2.5 bg-[#030805] border border-emerald-900 rounded-xl text-white text-xs placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="submit"
                        disabled={!newAmenityInput.trim()}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        + Add Amenity
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomAmenity(false);
                          setNewAmenityInput('');
                        }}
                        className="px-3.5 py-2.5 bg-[#0b1610] text-gray-400 hover:text-white border border-emerald-950 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-1/3 py-3.5 bg-[#050806] hover:bg-[#09140d] text-gray-300 border border-emerald-950 rounded-xl sm:rounded-full font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-2/3 py-3.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Next Step: Contact Info →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Contact & Submit */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 text-xs">
              {/* Property Photos & Upload Section */}
              <div className="bg-[#050806] border border-emerald-950 rounded-2xl p-3.5 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950 pb-3">
                  <div>
                    <label className="block text-white font-bold text-xs">
                      Property Photos ({images.length} / {maxSellImages})
                    </label>
                    <p className="text-[11px] text-gray-400">Upload up to {maxSellImages} photos (optional)</p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center space-x-1 bg-[#0a110d] p-1 rounded-xl border border-emerald-950 text-[11px] w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setUploadTab('file')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${uploadTab === 'file'
                        ? 'bg-emerald-500 text-black shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      <Upload size={12} className="shrink-0" />
                      <span>Upload Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab('url')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${uploadTab === 'url'
                        ? 'bg-emerald-500 text-black shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      <ImageIcon size={12} className="shrink-0" />
                      <span>Paste Image URL</span>
                    </button>
                  </div>
                </div>

                {uploadTab === 'file' ? (
                  /* File Drag & Drop Upload Zone */
                  <div className="relative border-2 border-dashed border-emerald-900/80 hover:border-emerald-500/80 transition-colors bg-[#080d0a] rounded-xl p-4 sm:p-6 text-center group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0e261a] border border-emerald-800/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Upload size={20} className="sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-200 group-hover:text-emerald-400 transition-colors">
                        Click to browse or drag & drop property photos
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Supports JPG, PNG, WEBP • Upload multiple images from gallery or camera
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Image URL input fallback */
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={urlInput ?? ''}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUrl();
                        }
                      }}
                      disabled={isAddingUrl}
                      placeholder="Paste image web link (e.g. https://...)"
                      className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-[#080d0a] border border-emerald-900/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none text-xs disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      disabled={isAddingUrl || !urlInput.trim()}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold rounded-xl transition-colors text-xs flex items-center space-x-1 cursor-pointer shrink-0"
                    >
                      {isAddingUrl ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Uploaded & In-Progress Photos Thumbnails Grid */}
                {(images.length > 0 || uploadQueue.length > 0) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-400">
                        Your Photos ({images.length} / {maxSellImages} uploaded):
                      </span>
                      {isUploadingImages && (
                        <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Uploading photos...</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                      {/* 1. Already Uploaded Photos */}
                      {images.map((img, idx) => (
                        <div key={`img-${idx}`} className="relative group rounded-xl overflow-hidden border border-emerald-900/80 aspect-video bg-black/40 shadow-md">
                          <LazyImage src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />

                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-emerald-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                              Cover
                            </span>
                          )}

                          <span className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center space-x-0.5">
                            <Check size={9} />
                            <span>{img.startsWith('data:') ? 'Ready' : 'Uploaded'}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}

                      {/* 2. In-Progress & Failed Upload Queue Items */}
                      {uploadQueue.map((item) => (
                        <div
                          key={item.id}
                          className={`relative rounded-xl overflow-hidden aspect-video bg-black/70 flex flex-col items-center justify-center border p-1 ${item.status === 'error' ? 'border-red-600 bg-red-950/40' : 'border-emerald-500/80'
                            }`}
                        >
                          <img src={item.previewUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />

                          {item.status === 'uploading' && (
                            <div className="relative z-10 flex flex-col items-center space-y-1 text-center px-1">
                              <Loader2 size={16} className="text-emerald-400 animate-spin" />
                              <span className="text-[10px] font-bold text-white font-mono">{item.progress}%</span>
                              <span className="text-[8px] text-emerald-300 font-semibold truncate max-w-[80px]">Uploading...</span>
                            </div>
                          )}

                          {item.status === 'error' && (
                            <div className="relative z-10 flex flex-col items-center space-y-1 text-center px-1">
                              <span className="text-[9px] font-extrabold text-red-400">Failed</span>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleRetryUpload(item)}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold flex items-center space-x-0.5"
                                  title="Retry Upload"
                                >
                                  <RotateCw size={10} />
                                  <span>Retry</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQueueItem(item.id)}
                                  className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                                  title="Dismiss"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* 3. Add More button inside grid */}
                      <label className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl aspect-video bg-[#080d0a] transition-colors text-emerald-400 hover:text-emerald-300 ${maxImagesReached || isUploadingImages
                        ? 'border-gray-800 opacity-50 cursor-not-allowed pointer-events-none'
                        : 'border-emerald-900/60 hover:border-emerald-500 cursor-pointer'
                        }`}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          disabled={maxImagesReached || isUploadingImages}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Plus size={18} />
                        <span className="text-[10px] font-bold mt-1">
                          {maxImagesReached ? 'Limit Reached' : 'Add More'}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

              </div>

              {/* Walkthrough Video Tour Section (Optional) */}
              <div className="bg-[#050806] border border-emerald-950 rounded-2xl p-3.5 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0e261a] border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
                      <Video size={16} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <label className="block text-white font-bold text-xs">
                          Property Video Tour
                        </label>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/60 text-emerald-400 text-[10px] font-extrabold flex items-center space-x-1">
                          <Sparkles size={10} />
                          <span>3x More Views</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">Upload a 30–90 sec walkthrough video (Optional)</p>
                    </div>
                  </div>
                </div>

                {videos.length === 0 ? (
                  /* Video Drag & Drop Upload Zone */
                  videoUploading ? (
                    <div className="border border-emerald-500/80 bg-[#080d0a] rounded-xl p-6 text-center space-y-3">
                      <Loader2 size={24} className="text-emerald-400 animate-spin mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">Uploading video tour to Cloudinary...</p>
                        <div className="w-full max-w-xs mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">{videoProgress}% completed</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-emerald-900/80 hover:border-emerald-500/80 transition-colors bg-[#080d0a] rounded-xl p-4 sm:p-6 text-center group cursor-pointer">
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={handleVideoFileUpload}
                        disabled={videoUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0e261a] border border-emerald-800/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                          <Video size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <span className="text-xs font-bold text-gray-200 group-hover:text-emerald-400 transition-colors">
                          Click to browse or drop property walkthrough video
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Supports MP4, MOV, WebM • Max 50 MB • Direct Cloudinary CDN streaming
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  /* Attached Video Preview Card */
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-800/80 bg-black/80 p-3 flex flex-col sm:flex-row items-center gap-4 shadow-lg">
                    <div className="w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black relative shrink-0 flex items-center justify-center border border-emerald-950">
                      {videos[0].includes('youtube.com') || videos[0].includes('youtu.be') ? (
                        <div className="flex flex-col items-center justify-center text-center p-2">
                          <Play size={24} className="text-red-500 mb-1" />
                          <span className="text-[10px] text-gray-300 font-bold truncate max-w-[140px]">YouTube Video</span>
                        </div>
                      ) : (
                        <video
                          src={videos[0]}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 inline-flex items-center space-x-1.5 shadow-xs">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <span>Video Tour Ready</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        This video tour will be featured on your property listing and attract verified tenants!
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(0)}
                      className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Owner Details - 1 column on mobile, 2 columns on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Owner / Agent Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={ownerName ?? ''}
                    onChange={(e) => setOwnerName(sanitizeName(e.target.value))}
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Contact Phone Number (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={ownerPhone ?? ''}
                    onChange={(e) => setOwnerPhone(sanitizePhone(e.target.value))}
                    className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl font-mono focus:border-emerald-500 focus:outline-none font-bold text-emerald-400 text-sm tracking-wide"
                  />
                </div>

              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Detailed Property Description</label>
                <textarea
                  rows={3}
                  value={description ?? ''}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your property, nearest landmarks, metro access, power backup details..."
                  className="w-full px-3.5 sm:px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-1/3 py-3.5 bg-[#050806] hover:bg-[#09140d] text-gray-300 border border-emerald-950 rounded-xl sm:rounded-full font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  ← Back to Specs
                </button>
                <button
                  type="submit"
                  disabled={submitting || isUploadingImages}
                  className="w-full sm:w-2/3 py-3.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isEditMode ? 'Saving Changes...' : 'Publishing Listing...'}</span>
                    </>
                  ) : isUploadingImages ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Uploading Photos to Cloudinary...</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Save Listing Changes' : 'Publish Property Listing FREE'}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success View */}
          {step === 4 && createdProperty && (
            <div className="text-center py-8 space-y-4">
              <div className={`w-16 h-16 ${isEditMode ? 'bg-[#0a2618] text-emerald-400 border border-emerald-800' : 'bg-[#261d0a] text-amber-400 border border-amber-800'} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
                {isEditMode ? <CheckCircle2 size={36} /> : <Clock size={36} />}
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {isEditMode ? 'Listing Updated Successfully!' : 'Submitted for Admin Verification!'}
              </h2>
              <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                {isEditMode ? (
                  <>All updates to property <strong className="text-emerald-400 font-mono">{createdProperty.pid || editPid}</strong> have been saved successfully.</>
                ) : (
                  <>Your property listing <strong className="text-emerald-400 font-mono">{createdProperty.pid}</strong> has been submitted to the Admin Moderation Queue.</>
                )}
              </p>
              {!isEditMode && (
                <div className="p-4 bg-[#0d1c14] border border-emerald-900/80 rounded-2xl max-w-md mx-auto text-xs text-emerald-300 font-medium">
                  🛡️ <strong>Pending Verification</strong>: Once our admin team verifies your listing details, it will automatically go live on the PROPZY website with 0% brokerage.
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => router.push(`/properties/${createdProperty.pid || editPid}`)}
                  className="px-6 cursor-pointer py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg transition-all"
                >
                  View Updated Listing
                </button>
                <button
                  onClick={() => router.push(`/dashboard?tab=my-properties`)}
                  className="px-6 cursor-pointer py-3 bg-[#09110c] hover:bg-[#121c16] border border-emerald-950 text-gray-300 hover:text-white font-bold text-xs rounded-full transition-colors"
                >
                  Back to My Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostPropertyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050806] flex items-center justify-center">
        <BrandSpinner message="Loading property wizard..." size="lg" />
      </div>
    }>
      <PostPropertyContent />
    </Suspense>
  );
}
