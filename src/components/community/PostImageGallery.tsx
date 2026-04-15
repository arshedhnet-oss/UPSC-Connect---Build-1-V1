import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface PostImageGalleryProps {
  images: string[];
}

const PostImageGallery = ({ images }: PostImageGalleryProps) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className={`mt-6 grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {images.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Attachment ${i + 1}`}
            loading="lazy"
            onClick={() => setLightboxIdx(i)}
            className="w-full rounded-lg border border-border object-cover cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: images.length === 1 ? "400px" : "220px" }}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="h-8 w-8" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + images.length) % images.length); }}
                className="absolute left-4 text-white/80 hover:text-white"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % images.length); }}
                className="absolute right-4 text-white/80 hover:text-white"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <img
            src={images[lightboxIdx]}
            alt="Full view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default PostImageGallery;
