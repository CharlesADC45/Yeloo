"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchActivePublicAnnouncements, type PublicAnnouncement } from "@/lib/publicAnnouncements";
import { useAuthStore } from "@/stores/authStore";
import { PublicAnnouncementCard } from "@/components/PublicAnnouncementCard";

const getAudienceLabel = (value: PublicAnnouncement["target_audience"]) => {
  if (value === "locataire") return "Locataires";
  if (value === "proprietaire") return "Proprietaires";
  return "Tout le monde";
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

  return (
    <section className="mx-auto w-full max-w-4xl">
      <PublicAnnouncementCard
        announcement={activeItem}
        audienceLabel={getAudienceLabel(activeItem.target_audience)}
        onDismiss={() => setDismissedIds((current) => [...current, activeItem.id])}
      />
      {visibleItems.length > 1 && (
        <div className="mt-4 flex justify-center gap-2 px-4 pb-4">
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
    </section>
  );
}
