import { X } from 'lucide-react';
import { useEffect } from 'react';

interface AvatarLightboxProps {
  url: string;
  name: string;
  onClose: () => void;
}

/** Full-screen avatar viewer with a close (X) button. */
export function AvatarLightbox({ url, name, onClose }: AvatarLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-surface/80 hover:bg-surface flex items-center justify-center text-foreground transition-all hover:scale-110 z-10"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt={name}
          className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl"
        />
        <p className="text-center mt-3 text-sm font-semibold text-foreground">{name}</p>
      </div>
    </div>
  );
}
