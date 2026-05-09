import React, { useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { fetchPlaceImages, PlaceImage } from '../services/imageService';
import { cn } from '../lib/utils';

interface SmartImageProps {
  place: string;
  state?: string;
  type?: string;
  className?: string;
  fallbackQuery?: string;
}

export function SmartImage({ place, state = '', type = 'travel', className, fallbackQuery }: SmartImageProps) {
  const [image, setImage] = useState<PlaceImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadImage() {
      setLoading(true);
      setError(false);
      try {
        const images = await fetchPlaceImages(place, state, [type]);
        if (mounted) {
          if (images && images.length > 0) {
            setImage(images[0]);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadImage();
    return () => { mounted = false; };
  }, [place, state, type]);

  const fallbackUrl = `https://source.unsplash.com/featured/800x600/?${(fallbackQuery || place).replace(/\s+/g, '')},${type}`;

  if (loading) {
    return (
      <div className={cn("bg-brand-navy/5 flex items-center justify-center", className)}>
        <Loader2 className="w-6 h-6 text-brand-coral animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      <img
        src={error || !image ? fallbackUrl : image.url}
        alt={image?.alt || place}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
      {image && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[8px] text-white flex items-center gap-1">
            <Camera className="w-2 h-2" />
            {image.author} via {image.source}
          </div>
        </div>
      )}
    </div>
  );
}
