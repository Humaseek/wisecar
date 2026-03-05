import React, { useMemo, useState } from "react";

export default function Gallery({ images = [], title = "" }) {
  const safeImages = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []),
    [images],
  );
  const [activeIdx, setActiveIdx] = useState(0);

  const active = safeImages[activeIdx] || safeImages[0];

  return (
    <div className="public-gallery">
      <div
        className="public-gallery__active"
        style={{ backgroundImage: `url(${active})` }}
        role="img"
        aria-label={title}
      />

      <div className="public-gallery__thumbs">
        {safeImages.slice(0, 8).map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            className={
              idx === activeIdx
                ? "public-gallery__thumb public-gallery__thumb--active"
                : "public-gallery__thumb"
            }
            onClick={() => setActiveIdx(idx)}
            aria-label={`image-${idx + 1}`}
          >
            <span
              className="public-gallery__thumb-img"
              style={{ backgroundImage: `url(${src})` }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
