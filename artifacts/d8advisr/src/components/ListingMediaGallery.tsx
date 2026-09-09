import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Images, Share, X } from 'lucide-react';
import { cn, consumerDesktopClass } from '@/components/SharedUI';

type ListingMediaGalleryProps = {
  images: string[];
  title: string;
  variant: 'venue' | 'event';
  onBack: () => void;
  onShare?: () => void;
  badge?: ReactNode;
};

export function ListingMediaGallery({
  images,
  title,
  variant,
  onBack,
  onShare,
  badge,
}: ListingMediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const desktopOpenButtonRef = useRef<HTMLButtonElement>(null);
  const mobileOpenButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const safeImages = images.filter(Boolean);
  const activeImage = safeImages[activeIndex] ?? safeImages[0];

  useEffect(() => {
    if (!viewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewerOpen(false);
      if (event.key === 'ArrowLeft') setActiveIndex(index => Math.max(0, index - 1));
      if (event.key === 'ArrowRight') setActiveIndex(index => Math.min(safeImages.length - 1, index + 1));
      if (event.key === 'Tab') {
        const focusable = Array.from(viewerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      const returnTarget = window.matchMedia('(min-width: 1024px)').matches
        ? desktopOpenButtonRef.current
        : mobileOpenButtonRef.current ?? desktopOpenButtonRef.current;
      returnTarget?.focus();
    };
  }, [safeImages.length, viewerOpen]);

  if (!activeImage) return null;

  const openViewer = (index: number) => {
    setActiveIndex(index);
    setViewerOpen(true);
  };

  const controls = (
    <>
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/35 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/55 lg:left-5 lg:top-5"
      >
        <ArrowLeft size={20} />
      </button>
      {badge ? (
        <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] z-20 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md lg:top-5">
          {badge}
        </div>
      ) : null}
      {onShare ? (
        <button
          type="button"
          onClick={onShare}
          aria-label={`Share ${title}`}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/35 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/55 lg:right-5 lg:top-5"
        >
          <Share size={18} />
        </button>
      ) : null}
    </>
  );

  const venueDesktopGallery = safeImages.length >= 3 ? (
    <div className="hidden h-[440px] grid-cols-3 grid-rows-2 gap-1.5 lg:grid">
      <MediaButton
        ref={desktopOpenButtonRef}
        src={safeImages[0]}
        alt={`${title}, photo 1`}
        onClick={() => openViewer(0)}
        className="col-span-2 row-span-2"
      />
      {safeImages.slice(1, 3).map((src, index) => (
        <MediaButton
          key={src}
          src={src}
          alt={`${title}, photo ${index + 2}`}
          onClick={() => openViewer(index + 1)}
        />
      ))}
    </div>
  ) : (
    <MediaButton
      ref={desktopOpenButtonRef}
      src={activeImage}
      alt={`${title}, photo ${activeIndex + 1}`}
      onClick={() => openViewer(activeIndex)}
      className="hidden h-[440px] lg:block"
    />
  );

  return (
    <>
      <section className={cn('w-full lg:px-6 lg:pt-6', consumerDesktopClass('wide'))} aria-label={`${title} photos`}>
        <div className="relative overflow-hidden bg-neutral-950 shadow-md lg:rounded-[32px]">
          {variant === 'venue' ? (
            <>
              {venueDesktopGallery}
              <MediaButton
                ref={mobileOpenButtonRef}
                src={activeImage}
                alt={`${title}, photo ${activeIndex + 1}`}
                onClick={() => openViewer(activeIndex)}
                className="aspect-[4/3] lg:hidden"
              />
            </>
          ) : (
            <div className="relative aspect-[4/3] overflow-hidden lg:h-[480px] lg:aspect-auto">
              <img
                src={activeImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
              />
              <div className="absolute inset-0 bg-black/35" />
              <button
                ref={desktopOpenButtonRef}
                type="button"
                onClick={() => openViewer(activeIndex)}
                aria-label={`View ${title} photo full screen`}
                className="absolute inset-0 z-10 flex h-full w-full cursor-zoom-in items-center justify-center p-3 lg:p-6"
              >
                <img src={activeImage} alt={title} className="h-full w-full object-contain drop-shadow-2xl" />
              </button>
            </div>
          )}

          {controls}

          {safeImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setActiveIndex(index => Math.max(0, index - 1))}
                disabled={activeIndex === 0}
                aria-label="Previous photo"
                className={cn(
                  'absolute left-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur disabled:pointer-events-none disabled:opacity-0',
                  variant === 'venue' && 'lg:hidden',
                )}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex(index => Math.min(safeImages.length - 1, index + 1))}
                disabled={activeIndex === safeImages.length - 1}
                aria-label="Next photo"
                className={cn(
                  'absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur disabled:pointer-events-none disabled:opacity-0',
                  variant === 'venue' && 'lg:hidden',
                )}
              >
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                onClick={() => openViewer(activeIndex)}
                className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/40 bg-black/55 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md lg:bottom-5 lg:right-5"
              >
                <Images size={14} /> View all {safeImages.length}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openViewer(0)}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/40 bg-black/55 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md lg:bottom-5 lg:right-5"
            >
              <Images size={14} /> View photo
            </button>
          )}
        </div>
      </section>

      {viewerOpen ? createPortal(
        <div
          ref={viewerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photo viewer`}
          className="fixed inset-0 z-[100] flex flex-col bg-black"
          onClick={() => setViewerOpen(false)}
        >
          <div className="flex shrink-0 items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] lg:px-8 lg:pt-6" onClick={event => event.stopPropagation()}>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setViewerOpen(false)}
              aria-label="Close photo viewer"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={21} />
            </button>
            <p className="max-w-[60%] truncate text-[13px] font-semibold text-white/80">{title}</p>
            <span className="text-[13px] font-medium text-white/60">{activeIndex + 1} / {safeImages.length}</span>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-4" onClick={event => event.stopPropagation()}>
            <img src={activeImage} alt={`${title}, photo ${activeIndex + 1}`} className="max-h-full max-w-full object-contain" />
            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={() => setActiveIndex(index => index - 1)}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 lg:left-8"
              >
                <ChevronLeft size={23} />
              </button>
            ) : null}
            {activeIndex < safeImages.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveIndex(index => index + 1)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 lg:right-8"
              >
                <ChevronRight size={23} />
              </button>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

type MediaButtonProps = {
  src: string;
  alt: string;
  onClick: () => void;
  className?: string;
};

const MediaButton = forwardRef<HTMLButtonElement, MediaButtonProps>(function MediaButton(
  { src, alt, onClick, className },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`View ${alt} full screen`}
      className={cn('group relative h-full w-full cursor-zoom-in overflow-hidden bg-neutral-900 text-left', className)}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]" />
    </button>
  );
});
