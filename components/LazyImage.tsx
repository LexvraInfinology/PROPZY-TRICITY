/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const loadedImageUrls = new Set<string>();

export function optimizeImageUrl(url: string, width = 600, quality = 70): string {
  if (!url) return '';
  
  // Base64 strings: return as-is for backward compatibility
  if (url.startsWith('data:image/')) {
    return url;
  }

  // Cloudinary image URL optimization
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    // If transformations are already present in URL, avoid duplicate insertion
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/q_auto') || url.includes('/image/upload/w_')) {
      return url;
    }
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
  }

  // Unsplash image optimization
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  return url;
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src = '',
  alt,
  className = '',
  fallbackSrc = '',
  objectFit = 'cover',
  ...props
}) => {
  const targetSrc = src || fallbackSrc;
  const optimizedSrc = optimizeImageUrl(targetSrc, 600, 70);
  const optimizedFallback = fallbackSrc ? optimizeImageUrl(fallbackSrc, 600, 70) : '';

  const [error, setError] = useState(false);
  const imgSrc = error ? optimizedFallback : optimizedSrc;
  
  const [loaded, setLoaded] = useState(() => loadedImageUrls.has(imgSrc));
  const [isVisible, setIsVisible] = useState(() => loadedImageUrls.has(imgSrc));
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Intersection Observer: Only activate network fetch when element enters viewport
  useEffect(() => {
    if (loadedImageUrls.has(imgSrc)) {
      setIsVisible(true);
      setLoaded(true);
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [imgSrc]);

  // 2. Pre-fetch image JS object only when visible
  useEffect(() => {
    if (!isVisible || loadedImageUrls.has(imgSrc)) return;

    const img = new window.Image();
    img.src = imgSrc;
    if (img.complete) {
      loadedImageUrls.add(imgSrc);
      setLoaded(true);
    } else {
      img.onload = () => {
        loadedImageUrls.add(imgSrc);
        setLoaded(true);
      };
      img.onerror = () => {
        setError(true);
        setLoaded(true);
      };
    }
  }, [isVisible, imgSrc]);

  if (!imgSrc) {
    return (
      <div ref={containerRef} className={`relative overflow-hidden bg-[#07110a] flex items-center justify-center ${className}`}>
        <ImageIcon size={22} className="text-emerald-900/60" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-[#0d1c14] ${className}`}>
      {/* Skeleton Shimmer Overlay */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a140f] via-[#11291d] to-[#0a140f] animate-pulse flex items-center justify-center">
          <ImageIcon size={24} className="text-emerald-900/60 animate-bounce" />
        </div>
      )}

      {isVisible && (
        <img
          src={imgSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            loadedImageUrls.add(imgSrc);
            setLoaded(true);
          }}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : objectFit === 'fill' ? 'object-fill' : 'object-cover'} transition-opacity duration-300 ease-out ${
            loaded && !error ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};
