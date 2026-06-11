"use client";

import { FiMaximize2, FiPlay, FiRotateCcw } from "react-icons/fi";
import { PhotoSphereViewer } from "@/components/PhotoSphereViewer";

type TourPoint = {
  id: string;
  title: string;
  description: string;
  position: {
    yaw: number;
    pitch: number;
  };
};

type Props = {
  tourUrl?: string | null;
  fallbackImageUrl?: string;
  title: string;
  location?: string;
  priceLabel?: string;
  className?: string;
  points?: TourPoint[];
};

const VIDEO_PATTERN = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
const IMAGE_PATTERN = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;

function EmptyTour({ className }: { className?: string }) {
  return (
    <div className={`relative flex h-full min-h-[24rem] w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-neutral-100 ${className ?? ""}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_74%_76%,rgba(20,184,166,0.12),transparent_34%)]" />
      <div className="relative max-w-xs text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-soft">
          <FiRotateCcw className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-semibold text-neutral-900">Visite immersive non disponible</p>
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Le proprietaire pourra ajouter une image 360 ou une video 360.
        </p>
      </div>
    </div>
  );
}

export function ImmersiveTourViewer({
  tourUrl,
  fallbackImageUrl = "/property-fallback.svg",
  title,
  location,
  priceLabel,
  className,
  points,
}: Props) {
  if (!tourUrl) return <EmptyTour className={className} />;

  const isVideo = VIDEO_PATTERN.test(tourUrl);
  const isImage = IMAGE_PATTERN.test(tourUrl) || !isVideo;

  if (isVideo) {
    return (
      <div className={`relative h-full w-full overflow-hidden rounded-[1.75rem] bg-neutral-950 ${className ?? ""}`}>
        <video
          src={tourUrl}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-white/92 px-4 py-3 shadow-soft backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">Video 360</p>
          <p className="mt-1 text-sm font-semibold text-neutral-950">{title}</p>
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-neutral-950/72 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
          <FiPlay className="h-4 w-4" />
          Lancez la visite
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <PhotoSphereViewer
        imageUrl={tourUrl}
        fallbackImageUrl={fallbackImageUrl}
        title={title}
        location={location}
        priceLabel={priceLabel}
        className={className}
        points={points}
      />
    );
  }

  return (
    <div className={`relative flex h-full min-h-[24rem] w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-neutral-950 ${className ?? ""}`}>
      <a
        href={tourUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 shadow-soft transition hover:bg-neutral-100"
      >
        <FiMaximize2 className="h-4 w-4" />
        Ouvrir la visite
      </a>
    </div>
  );
}
