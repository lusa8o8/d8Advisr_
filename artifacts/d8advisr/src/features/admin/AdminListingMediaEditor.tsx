import { useRef, useState } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import { uploadListingImage, type ListingMediaScope } from '@/lib/supabase';

const MAX_IMAGES = 6;

export function AdminListingMediaEditor({
  images,
  onChange,
  scope = 'venues',
  review = false,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  scope?: ListingMediaScope;
  review?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const uniqueImages = Array.from(new Set(images.filter(Boolean))).slice(0, MAX_IMAGES);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const remaining = MAX_IMAGES - uniqueImages.length;
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        uploaded.push(await uploadListingImage(file, scope));
      }
      onChange([...uniqueImages, ...uploaded]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addUrl = () => {
    const value = url.trim();
    if (!value || uniqueImages.includes(value) || uniqueImages.length >= MAX_IMAGES) return;
    try {
      new URL(value);
      onChange([...uniqueImages, value]);
      setUrl('');
      setError(null);
    } catch {
      setError('Enter a valid image URL.');
    }
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => void addFiles(event.target.files)} />
      {uniqueImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {uniqueImages.map((image, index) => (
            <div key={image} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <img src={image} alt={index === 0 ? 'Venue cover' : `Venue image ${index + 1}`} className="h-28 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-2 py-1 text-[9px] font-bold text-white">
                <button type="button" disabled={index === 0} onClick={() => onChange([image, ...uniqueImages.filter(item => item !== image)])} className="flex items-center gap-1 disabled:opacity-100">
                  <Star size={10} /> {index === 0 ? 'Cover' : 'Make cover'}
                </button>
                <button type="button" onClick={() => onChange(uniqueImages.filter(item => item !== image))} aria-label={`Remove image ${index + 1}`}><X size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" disabled={uploading || uniqueImages.length >= MAX_IMAGES} onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-[12px] font-bold text-gray-600 disabled:opacity-50">
        <ImagePlus size={16} /> {uploading ? 'Uploading...' : uniqueImages.length ? 'Add images' : 'Upload images'} ({uniqueImages.length}/{MAX_IMAGES})
      </button>
      <div className="flex gap-2">
        <input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="Temporary image URL fallback" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#FF5A5F]" />
        <button type="button" onClick={addUrl} disabled={!url.trim() || uniqueImages.length >= MAX_IMAGES} className="rounded-xl bg-gray-100 px-3 text-[11px] font-bold text-gray-700 disabled:opacity-50">Add URL</button>
      </div>
      <p className={`text-[10px] ${review ? 'text-amber-600' : 'text-gray-400'}`}>The first image is the cover. Removing an image unlinks it from this listing; uploaded storage is retained for audit and recovery.</p>
      {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
