"use client";

import { useEffect, useMemo, useState } from "react";
import { FiBell, FiInfo, FiTag, FiTool, FiX } from "react-icons/fi";
import {
  fetchActivePublicAnnouncements,
  type PublicAnnouncement,
} from "@/lib/publicAnnouncements";
import { useAuthStore } from "@/stores/authStore";

const iconMap = {
  info: FiInfo,
  maintenance: FiTool,
  promo: FiTag,
  alert: FiBell,
};

const resolveAnnouncementAssetUrl = (value?: string | null) => {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${value}`;
};

export function PublicAnnouncementCarousel() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const audience =
      user?.role === "proprietaire" || user?.role === "locataire" ? user.role : "all";
    fetchActivePublicAnnouncements(audience, controller.signal)
      .then(setItems)
      .catch(() => setItems([]));
    return () => controller.abort();
  }, [user?.role]);

  const visibleItems = useMemo(
    () => items.filter((item) => !dismissedIds.includes(item.id)),
    [dismissedIds, items]
  );

  useEffect(() => {
    if (visibleItems.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleItems.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [visibleItems.length]);

  useEffect(() => {
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, visibleItems.length]);

  if (!visibleItems.length) return null;

  const activeItem = visibleItems[activeIndex] || visibleItems[0];
  const Icon = iconMap[activeItem.icon as keyof typeof iconMap] || FiInfo;
  const posterUrl = resolveAnnouncementAssetUrl(activeItem.image_url);
  const hasLink = Boolean(activeItem.link_url);

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-[#f0f2ff] shadow-soft">
        <div className={`grid ${posterUrl ? "lg:grid-cols-[1fr_0.95fr]" : ""}`}>
          <div className="flex min-h-[11rem] items-center gap-4 px-4 py-4 sm:min-h-[14rem] sm:px-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-blue-700 shadow-sm">
              <Icon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-4 text-sm font-semibold leading-6 text-neutral-950 sm:text-xl sm:leading-9">
                {activeItem.message}
              </p>
              {hasLink && (
                <a
                  href={activeItem.link_url || "#"}
                  target={activeItem.link_url?.startsWith("http") ? "_blank" : undefined}
                  rel={activeItem.link_url?.startsWith("http") ? "noreferrer" : undefined}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white sm:text-sm"
                >
                  {activeItem.cta_label || "En savoir plus"}
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissedIds((current) => [...current, activeItem.id])}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-white"
              aria-label="Fermer la notification"
            >
              <FiX />
            </button>
          </div>
          {posterUrl && (
            <div className="min-h-[11rem] sm:min-h-[14rem]">
              <img
                src={posterUrl}
                alt="Poster notification"
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
        {visibleItems.length > 1 && (
          <div className="flex justify-center gap-2 px-4 pb-4">
            {visibleItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition ${
                  index === activeIndex ? "w-7 bg-neutral-950" : "w-1.5 bg-neutral-300"
                }`}
                aria-label={`Afficher la notification ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
