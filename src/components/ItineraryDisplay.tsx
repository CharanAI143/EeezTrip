import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, Check, Sparkles, MapPin, ExternalLink, Share2, Bookmark, Loader2, Camera, Navigation, Map as MapIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { MapMarker } from '../types';
import { User } from 'firebase/auth';
import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { SmartImage } from './SmartImage';

interface ItineraryDisplayProps {
  content: string;
  isComplete: boolean;
  user?: User | null;
  onSave?: () => void;
  onLogin?: () => void;
}

export function ItineraryDisplay({ content, isComplete, user, onSave, onLogin }: ItineraryDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);

  // Parse metadata and markers from markdown content
  const { filteredContent, markers, title, destination, heroUrl, summary } = useMemo(() => {
    const markerTagRegex = /<map_markers_json>([\s\S]*?)<\/map_markers_json>/i;
    const internalBlockRegex = /#+ \[?INTERNAL_DATA\]?[\s\S]*?\[?END_INTERNAL_DATA\]?/gi;
    
    let match = content.match(markerTagRegex);
    let parsedMarkers: MapMarker[] = [];
    
    if (match) {
      try {
        parsedMarkers = JSON.parse(match[1]);
      } catch (e) {
        console.error("Failed to parse markers JSON", e);
      }
    }
    
    // Extract title (first H1)
    const titleMatch = content.match(/^# (.*)$/m);
    const extractedTitle = titleMatch ? titleMatch[1] : 'My Trip Plan';

    // Extract destination from title or content
    const extractedDestination = extractedTitle.split('Plan: ')[1] || extractedTitle;

    // Detect hero image
    const heroImageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    const heroUrl = heroImageMatch ? heroImageMatch[1] : `https://source.unsplash.com/featured/1200x600/?${extractedDestination.replace(/\s+/g, '')},travel`;

    // Strictly strip the internal data block and any manual image syntax from the visual content
    let cleanContent = content
      .replace(internalBlockRegex, '')
      .replace(/<map_markers_json>([\s\S]*?)<\/map_markers_json>/i, '')
      .replace(/#+ Markers[\s\S]*?(?=($|#))/gi, '')
      .replace(/!\[.*?\]\(.*?\)/g, '') // Hide all markdown images in content
      .trim();

    // Extract summary (first paragraph that isn't a heading or list)
    const summaryMatch = cleanContent.match(/^(?![#\*-])(.*)/m);
    const summary = summaryMatch ? summaryMatch[1] : '';

    return { 
      filteredContent: cleanContent, 
      markers: parsedMarkers, 
      title: extractedTitle, 
      destination: extractedDestination, 
      heroUrl,
      summary
    };
  }, [content]);

  const handleFocusMarker = (marker: MapMarker) => {
    setHighlightedMarkerId(marker.id);
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleVisited = (id: string) => {
    setVisitedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(filteredContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!user) {
      if (onLogin) onLogin();
      return;
    }
    if (isSaved || isSaving) return;

    setIsSaving(true);
    const path = 'saved_trips';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        title,
        destination,
        content: filteredContent,
        createdAt: serverTimestamp()
      });
      setIsSaved(true);
      if (onSave) setTimeout(onSave, 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'My Trip Plan - EeezTrip',
      text: `Check out this amazing AI-generated trip plan!`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-trip-plan.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!content) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-brand-amber text-brand-navy text-[10px] font-black uppercase tracking-widest rounded-md">
            {isComplete ? 'Complete Plan' : 'Drafting...'}
          </div>
          <h2 className="text-2xl font-bold text-brand-navy">Your Custom Itinerary</h2>
        </div>
        <div className="flex gap-2">
          {isComplete && (
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                isSaved 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-brand-navy text-white hover:bg-brand-slate hover:shadow-md'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSaved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              {isSaved ? 'Saved!' : user ? 'Save Trip' : 'Login to Save'}
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2 bg-white border border-brand-border rounded-lg hover:bg-gray-50 transition-all text-gray-500"
            title="Share plan"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 bg-white border border-brand-border rounded-lg hover:bg-gray-50 transition-all text-gray-500"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-white border border-brand-border rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all text-brand-slate"
          >
            <Download className="w-4 h-4" /> Download Plan
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-8"
      >
        {/* Immersive Hero / Overview Section */}
        <div className="relative min-h-[400px] md:min-h-[500px] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col justify-end group">
          <SmartImage 
            place={destination}
            className="absolute inset-0 w-full h-full"
            fallbackQuery={heroUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/20 to-transparent" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-700" />
          
          <div className="relative z-10 p-8 md:p-16 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="px-4 py-1.5 bg-brand-coral text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-coral/40">
                   Overview
                 </div>
                 <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-black uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5 text-brand-amber" />
                    {destination}
                 </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-lg">
                {title.replace('Plan: ', '')}
              </h1>
            </div>

            {summary && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-3xl p-6 md:p-8 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-2xl"
              >
                <div className="flex gap-4">
                  <Sparkles className="w-6 h-6 text-brand-amber shrink-0" />
                  <p className="text-white/90 text-sm md:text-lg font-medium leading-relaxed italic">
                    "{summary}"
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="absolute top-8 left-8">
             <div className="px-5 py-2.5 bg-brand-navy/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2.5 transition-all hover:bg-brand-navy/60">
                <Camera className="w-4 h-4 text-brand-amber" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Premium Experience</span>
             </div>
          </div>
        </div>

        {/* Content Section */}

        <div className="markdown-body">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => {
                // If a paragraph contains a div (like our images), render as a div to avoid p > div hydration error
                const childrenArray = React.Children.toArray(children);
                const hasBlockElement = childrenArray.some(child => {
                  if (!React.isValidElement(child)) return false;
                  
                  // Check for standard block elements
                  if (typeof child.type === 'string' && ['div', 'section', 'article'].includes(child.type)) {
                    return true;
                  }
                  
                  // Check for our custom components that render block elements
                  // Note: Custom components like motion.div are functions/objects
                  const type = child.type as any;
                  if (type && (type.displayName === 'motion.div' || type.name === 'motion.div')) {
                    return true;
                  }
                  
                  return false;
                });
                
                // react-markdown wraps images in paragraphs. Since our img override returns a div, we must unwrap it.
                if (hasBlockElement) {
                   return <div className="mb-4">{children}</div>;
                }
                return <p className="mb-4">{children}</p>;
              },
              li: ({ children, ...props }) => {
                return (
                  <li {...props}>
                    {children}
                  </li>
                );
              },
              h1: () => null,
              h2: ({ children }) => (
                <h2 className="text-2xl font-black text-brand-navy mt-12 mb-6 flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-brand-coral rounded-full" />
                  {children}
                </h2>
              ),
              img: () => null, // Hidden as per request
              a: ({ children, href, title, ...props }) => {
                const isGoogleMaps = href?.startsWith('https://www.google.com/maps/search/');
                
                if (isGoogleMaps) {
                  return (
                    <motion.a 
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={href}
                      title={title}
                      className="inline-flex items-center gap-2 my-2 px-5 py-3 bg-white border border-brand-border rounded-xl text-brand-navy font-bold shadow-sm hover:shadow-md hover:border-brand-coral/30 hover:text-brand-coral transition-all no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="w-4 h-4" />
                      {children}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </motion.a>
                  );
                }

                return (
                  <a 
                    href={href}
                    title={title}
                    className="text-brand-coral hover:text-brand-amber font-semibold underline decoration-brand-coral/30 underline-offset-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                );
              },
              strong: ({ children }) => {
                const text = String(children);
                const marker = markers.find(m => m.name.toLowerCase() === text.toLowerCase());
                
                if (marker) {
                  return (
                    <button
                      onClick={() => handleFocusMarker(marker)}
                      className={`inline-flex items-center gap-1 font-bold transition-colors ${
                        visitedIds.has(marker.id)
                          ? 'text-green-600 line-through opacity-50'
                          : highlightedMarkerId === marker.id 
                            ? 'text-brand-amber underline decoration-brand-amber underline-offset-4' 
                            : 'text-brand-coral hover:underline decoration-brand-coral/30 underline-offset-4'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      {children}
                    </button>
                  );
                }
                return <strong>{children}</strong>;
              }
            }}
          >
            {filteredContent}
          </ReactMarkdown>
        </div>
      </motion.div>
      
      {!isComplete && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="bg-brand-navy text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-bold">AI is crafting your escape...</span>
          </div>
        </div>
      )}
    </div>
  );
}
