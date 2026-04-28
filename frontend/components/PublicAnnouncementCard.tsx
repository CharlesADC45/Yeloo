"use client";

import { FiBell, FiExternalLink, FiInfo, FiTag, FiTool, FiX } from "react-icons/fi";
import { getApiBaseUrl } from "@/lib/api";

type AnnouncementMode = "text" | "poster_auto" | "poster_manual";
type PosterFont = "sans" | "serif" | "display";
type PosterSize = "sm" | "md" | "lg" | "xl";
type PosterPosition = "left" | "right" | "top" | "bottom" | "center";
type PosterInset = "compact" | "comfortable" | "airy";
type PosterOverlay = "soft" | "medium" | "strong";

export type PublicAnnouncementCardData = {
  id: string;
  message: string;
  icon: string;
  display_mode?: AnnouncementMode;
  image_url?: string | null;
  link_url?: string | null;
  cta_label?: string | null;
  font_family?: string | null;
  text_color?: string | null;
  text_size?: string | null;
  text_position?: string | null;
  content_inset?: string | null;
  overlay_strength?: string | null;
};

const iconMap = {
  info: FiInfo,
  maintenance: FiTool,
  promo: FiTag,
  alert: FiBell,
};

const resolveAnnouncementAssetUrl = (value?: string | null) => {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  return `${getApiBaseUrl()}${value}`;
};

const fontClassMap: Record<PosterFont, string> = {
  sans: "font-sans",
  serif: "font-serif",
  display: "font-sans tracking-[-0.03em]",
};

const sizeClassMap: Record<PosterSize, string> = {
  sm: "text-sm leading-6 sm:text-lg sm:leading-8",
  md: "text-base leading-7 sm:text-2xl sm:leading-10",
  lg: "text-lg leading-8 sm:text-3xl sm:leading-[1.2]",
  xl: "text-xl leading-9 sm:text-4xl sm:leading-[1.15]",
};

const insetClassMap: Record<PosterInset, string> = {
  compact: "p-4 sm:p-5",
  comfortable: "p-5 sm:p-6",
  airy: "p-6 sm:p-8",
};

const overlayClassMap: Record<PosterOverlay, string> = {
  soft: "from-black/40 via-black/18 to-transparent",
  medium: "from-black/60 via-black/28 to-transparent",
  strong: "from-black/78 via-black/42 to-black/12",
};

function getPositionClasses(position: PosterPosition) {
  switch (position) {
    case "right":
      return "items-end justify-center text-right";
    case "top":
      return "items-center justify-start text-center";
    case "bottom":
      return "items-center justify-end text-center";
    case "center":
      return "items-center justify-center text-center";
    case "left":
    default:
      return "items-start justify-center text-left";
  }
}

function getOverlayDirection(position: PosterPosition) {
  switch (position) {
    case "right":
      return "bg-gradient-to-l";
    case "top":
      return "bg-gradient-to-b";
    case "bottom":
      return "bg-gradient-to-t";
    case "center":
      return "bg-black/35";
    case "left":
    default:
      return "bg-gradient-to-r";
  }
}

type Props = {
  announcement: PublicAnnouncementCardData;
  onDismiss?: () => void;
  preview?: boolean;
  audienceLabel?: string;
};

export function PublicAnnouncementCard({
  announcement,
  onDismiss,
  preview = false,
  audienceLabel,
}: Props) {
  const Icon = iconMap[announcement.icon as keyof typeof iconMap] || FiInfo;
  const mode = announcement.display_mode || "text";
  const posterUrl = resolveAnnouncementAssetUrl(announcement.image_url);
  const hasPoster = Boolean(posterUrl) && mode !== "text";
  const position = (announcement.text_position || "left") as PosterPosition;
  const overlayStrength = (announcement.overlay_strength || "medium") as PosterOverlay;
  const fontFamily = (announcement.font_family || "display") as PosterFont;
  const textSize = (announcement.text_size || "md") as PosterSize;
  const contentInset = (announcement.content_inset || "comfortable") as PosterInset;
  const textColor = announcement.text_color || "#ffffff";
  const hasLink = Boolean(announcement.link_url);

  if (hasPoster) {
    return (
      <div className="relative min-h-[13rem] overflow-hidden rounded-[1.75rem] border border-blue-100 bg-neutral-950 shadow-soft">
        <img src={posterUrl} alt="Poster notification" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className={`absolute inset-0 ${getOverlayDirection(position)} ${
            position === "center" ? "" : overlayClassMap[overlayStrength]
          }`}
        />
        <div
          className={`relative flex min-h-[13rem] ${getPositionClasses(position)} ${insetClassMap[contentInset]}`}
        >
          <div className={`max-w-[38rem] ${position === "top" || position === "bottom" || position === "center" ? "mx-auto" : ""}`}>
            {mode === "poster_auto" && (
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-2xl text-blue-700 shadow-sm">
                <Icon />
              </span>
            )}
            {audienceLabel && (
              <div className="mb-3">
                <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                  {audienceLabel}
                </span>
              </div>
            )}
            <p
              className={`${fontClassMap[fontFamily]} ${sizeClassMap[textSize]} font-semibold`}
              style={{ color: textColor }}
            >
              {announcement.message}
            </p>
            {hasLink && (
              <a
                href={preview ? undefined : announcement.link_url || "#"}
                target={!preview && announcement.link_url?.startsWith("http") ? "_blank" : undefined}
                rel={!preview && announcement.link_url?.startsWith("http") ? "noreferrer" : undefined}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-700 sm:text-sm"
                onClick={preview ? (event) => event.preventDefault() : undefined}
              >
                {announcement.cta_label || "En savoir plus"}
                <FiExternalLink />
              </a>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-neutral-700 backdrop-blur hover:bg-white"
            aria-label="Fermer la notification"
          >
            <FiX />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-[#f0f2ff] shadow-soft">
      <div className="flex min-h-[11rem] items-center gap-4 px-4 py-4 sm:min-h-[14rem] sm:px-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-blue-700 shadow-sm">
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          {audienceLabel && (
            <div className="mb-3">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-neutral-700">
                {audienceLabel}
              </span>
            </div>
          )}
          <p className="line-clamp-4 text-sm font-semibold leading-6 text-neutral-950 sm:text-xl sm:leading-9">
            {announcement.message}
          </p>
          {hasLink && (
            <a
              href={preview ? undefined : announcement.link_url || "#"}
              target={!preview && announcement.link_url?.startsWith("http") ? "_blank" : undefined}
              rel={!preview && announcement.link_url?.startsWith("http") ? "noreferrer" : undefined}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white sm:text-sm"
              onClick={preview ? (event) => event.preventDefault() : undefined}
            >
              {announcement.cta_label || "En savoir plus"}
              <FiExternalLink />
            </a>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-white"
            aria-label="Fermer la notification"
          >
            <FiX />
          </button>
        )}
      </div>
    </div>
  );
}
