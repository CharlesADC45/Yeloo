"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FiBell,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiImage,
  FiInfo,
  FiTag,
  FiTool,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  type AdminPropertySummary,
  type PublicAnnouncement,
  createPublicAnnouncement,
  deletePublicAnnouncement,
  fetchAdminProperties,
  fetchPublicAnnouncementsAdmin,
  uploadPublicAnnouncementImage,
  updateAdminPropertyPromo,
  updatePublicAnnouncement,
} from "@/lib/admin";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const iconOptions = [
  { value: "info", label: "Info", Icon: FiInfo },
  { value: "maintenance", label: "Maintenance", Icon: FiTool },
  { value: "promo", label: "Promo", Icon: FiTag },
  { value: "alert", label: "Alerte", Icon: FiBell },
];

const audienceOptions = [
  { value: "all", label: "Tout le monde" },
  { value: "locataire", label: "Locataires" },
  { value: "proprietaire", label: "Proprietaires" },
] as const;

type AnnouncementAudience = (typeof audienceOptions)[number]["value"];

const formatDate = (value?: string | null) => {
  if (!value) return "Aucune limite";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAudienceLabel = (value: string) =>
  audienceOptions.find((option) => option.value === value)?.label || "Tout le monde";

const getIcon = (value: string) =>
  iconOptions.find((option) => option.value === value)?.Icon || FiInfo;

export default function AdminNotificationsPage() {
  const token = useAuthStore((state) => state.token);
  const createImageInputRef = useRef<HTMLInputElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [properties, setProperties] = useState<AdminPropertySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Maintenance de 1h programmee pour ce soir 23h50. Merci.");
  const [icon, setIcon] = useState("maintenance");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("En savoir plus");
  const [targetAudience, setTargetAudience] = useState<AnnouncementAudience>("all");
  const [durationHours, setDurationHours] = useState(24);
  const [isActive, setIsActive] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [promoLabel, setPromoLabel] = useState("Promo speciale");
  const [promoHours, setPromoHours] = useState(72);
  const [pending, setPending] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    message: "",
    icon: "info",
    imageUrl: "",
    linkUrl: "",
    ctaLabel: "",
    targetAudience: "all" as AnnouncementAudience,
    durationHours: 24,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const promoProperties = useMemo(
    () => properties.filter((property) => property.promo_label),
    [properties]
  );

  const PreviewIcon = getIcon(icon);

  const resolveAssetUrl = (value?: string | null) => {
    if (!value) return "";
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [announcementData, propertyData] = await Promise.all([
          fetchPublicAnnouncementsAdmin(token),
          fetchAdminProperties(token),
        ]);
        if (!active) return;
        setAnnouncements(announcementData);
        setProperties(propertyData);
        setSelectedPropertyId((current) => current || propertyData[0]?.id || "");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Chargement impossible.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const refresh = async () => {
    if (!token) return;
    const [announcementData, propertyData] = await Promise.all([
      fetchPublicAnnouncementsAdmin(token),
      fetchAdminProperties(token),
    ]);
    setAnnouncements(announcementData);
    setProperties(propertyData);
  };

  const handleCreateAnnouncement = async () => {
    if (!token) return;
    setPending("announcement");
    setError(null);
    setSuccess(null);
    try {
      const created = await createPublicAnnouncement(token, {
        message,
        icon,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        cta_label: ctaLabel.trim() || null,
        target_audience: targetAudience,
        duration_hours: durationHours,
        is_active: isActive,
      });
      setAnnouncements((current) => [created, ...current]);
      setImageUrl("");
      setLinkUrl("");
      setCtaLabel("En savoir plus");
      setSuccess("Notification publique creee.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation impossible.");
    } finally {
      setPending(null);
    }
  };

  const handleToggleAnnouncement = async (item: PublicAnnouncement) => {
    if (!token) return;
    setPending(item.id);
    setError(null);
    try {
      const updated = await updatePublicAnnouncement(token, item.id, {
        is_active: !item.is_active,
      });
      setAnnouncements((current) =>
        current.map((announcement) => (announcement.id === updated.id ? updated : announcement))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise a jour impossible.");
    } finally {
      setPending(null);
    }
  };

  const startEditAnnouncement = (item: PublicAnnouncement) => {
    setEditingId(item.id);
    setEditForm({
      message: item.message,
      icon: item.icon,
      imageUrl: item.image_url || "",
      linkUrl: item.link_url || "",
      ctaLabel: item.cta_label || "",
      targetAudience: item.target_audience,
      durationHours: item.duration_hours,
    });
    setError(null);
    setSuccess(null);
  };

  const handleSaveAnnouncement = async (item: PublicAnnouncement) => {
    if (!token) return;
    setPending(`edit-${item.id}`);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updatePublicAnnouncement(token, item.id, {
        message: editForm.message,
        icon: editForm.icon,
        image_url: editForm.imageUrl.trim() || null,
        link_url: editForm.linkUrl.trim() || null,
        cta_label: editForm.ctaLabel.trim() || null,
        target_audience: editForm.targetAudience,
        duration_hours: editForm.durationHours,
      });
      setAnnouncements((current) =>
        current.map((announcement) => (announcement.id === updated.id ? updated : announcement))
      );
      setEditingId(null);
      setSuccess("Notification mise a jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise a jour impossible.");
    } finally {
      setPending(null);
    }
  };

  const handleDeleteAnnouncement = async (item: PublicAnnouncement) => {
    if (!token) return;
    setPending(`delete-${item.id}`);
    setError(null);
    setSuccess(null);
    try {
      await deletePublicAnnouncement(token, item.id);
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== item.id));
      setSuccess("Notification supprimee.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setPending(null);
    }
  };

  const handleApplyPromo = async () => {
    if (!token || !selectedPropertyId) return;
    setPending("promo");
    setError(null);
    setSuccess(null);
    try {
      await updateAdminPropertyPromo(token, selectedPropertyId, {
        promo_label: promoLabel,
        duration_hours: promoHours,
      });
      await refresh();
      setSuccess("Promo visible sur l'image de l'annonce.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promo impossible.");
    } finally {
      setPending(null);
    }
  };

  const handleClearPromo = async (propertyId: string) => {
    if (!token) return;
    setPending(propertyId);
    setError(null);
    try {
      await updateAdminPropertyPromo(token, propertyId, { clear: true });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression promo impossible.");
    } finally {
      setPending(null);
    }
  };

  const handleUploadAnnouncementImage = async (file: File, mode: "create" | "edit") => {
    if (!token) return;
    setPending(mode === "create" ? "upload-image" : "edit-upload-image");
    setError(null);
    try {
      const payload = await uploadPublicAnnouncementImage(token, file);
      if (mode === "create") {
        setImageUrl(payload.url);
      } else {
        setEditForm((current) => ({ ...current, imageUrl: payload.url }));
      }
      setSuccess("Poster ajouté.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-8"
      >
        <section className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            <FiBell />
            Notifications publiques
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
            Messages carousel et promos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Publie une annonce courte sur l'accueil et colle les reductions directement sur les images des logements.
          </p>
        </section>

        {isLoading ? (
          <div className="rounded-[1.5rem] bg-neutral-50 p-6 text-sm text-neutral-500">Chargement...</div>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <FiBell />
                </span>
                <div>
                  <h2 className="font-semibold text-neutral-950">Creer une notification</h2>
                  <p className="text-xs text-neutral-500">Visible en carousel sur la page publique.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Texte
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Lien (optionnel)
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      placeholder="https://yeloo.ci/promo"
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Texte du bouton
                    <input
                      value={ctaLabel}
                      onChange={(event) => setCtaLabel(event.target.value)}
                      placeholder="En savoir plus"
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Poster
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Ajoute une image large pour un rendu carousel plus premium.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => createImageInputRef.current?.click()}
                        disabled={pending === "upload-image"}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-60"
                      >
                        <FiImage />
                        {pending === "upload-image" ? "Upload..." : "Ajouter un poster"}
                      </button>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-neutral-500"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={createImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUploadAnnouncementImage(file, "create");
                      event.currentTarget.value = "";
                    }}
                  />
                  {imageUrl && (
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-neutral-200 bg-white">
                      <img
                        src={resolveAssetUrl(imageUrl)}
                        alt="Poster notification"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Icone
                    <select
                      value={icon}
                      onChange={(event) => setIcon(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Cible
                    <select
                      value={targetAudience}
                      onChange={(event) => setTargetAudience(event.target.value as AnnouncementAudience)}
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {audienceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Duree (heures)
                    <input
                      type="number"
                      min={1}
                      max={2160}
                      value={durationHours}
                      onChange={(event) => setDurationHours(Number(event.target.value))}
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-blue-100 bg-[#f0f2ff]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex w-full items-center justify-between gap-3 px-4 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Apercu live
                      </p>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-neutral-600">
                        {getAudienceLabel(targetAudience)}
                      </span>
                    </div>
                  </div>
                  <div className={`grid gap-0 ${imageUrl ? "sm:grid-cols-[1fr_0.88fr]" : ""}`}>
                    <div className="flex min-h-[11rem] items-center gap-4 px-4 py-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-blue-700 shadow-sm">
                        <PreviewIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-4 text-sm font-semibold leading-6 text-neutral-950 sm:text-base">
                          {message || "Ton message apparaitra ici."}
                        </p>
                        {linkUrl && (
                          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white">
                            {ctaLabel || "En savoir plus"}
                            <FiExternalLink />
                          </span>
                        )}
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600">
                        <FiX />
                      </span>
                    </div>
                    {imageUrl && (
                      <div className="min-h-[11rem]">
                        <img
                          src={resolveAssetUrl(imageUrl)}
                          alt="Poster aperçu"
                          className="h-full min-h-[11rem] w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsActive((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700"
                >
                  {isActive ? <FiToggleRight className="text-blue-700" /> : <FiToggleLeft />}
                  {isActive ? "Activee a la publication" : "Creer en pause"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateAnnouncement()}
                  disabled={pending === "announcement"}
                  className="w-full rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pending === "announcement" ? "Publication..." : "Publier la notification"}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {announcements.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-neutral-50 p-4">
                    {editingId === item.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editForm.message}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, message: event.target.value }))
                          }
                          rows={3}
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className="grid gap-3 sm:grid-cols-3">
                          <select
                            value={editForm.icon}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, icon: event.target.value }))
                            }
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          >
                            {iconOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editForm.targetAudience}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                targetAudience: event.target.value as AnnouncementAudience,
                              }))
                            }
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          >
                            {audienceOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={2160}
                            value={editForm.durationHours}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                durationHours: Number(event.target.value),
                              }))
                            }
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                          <input
                            type="url"
                            value={editForm.linkUrl}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, linkUrl: event.target.value }))
                            }
                            placeholder="https://yeloo.ci/promo"
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                          <input
                            value={editForm.ctaLabel}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, ctaLabel: event.target.value }))
                            }
                            placeholder="Texte du bouton"
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editImageInputRef.current?.click()}
                              disabled={pending === "edit-upload-image"}
                              className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-60"
                            >
                              <FiImage />
                              {pending === "edit-upload-image" ? "Upload..." : "Changer le poster"}
                            </button>
                            {editForm.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setEditForm((current) => ({ ...current, imageUrl: "" }))}
                                className="rounded-full bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-500"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                          <input
                            ref={editImageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleUploadAnnouncementImage(file, "edit");
                              event.currentTarget.value = "";
                            }}
                          />
                          {editForm.imageUrl && (
                            <img
                              src={resolveAssetUrl(editForm.imageUrl)}
                              alt="Poster notification"
                              className="mt-3 h-40 w-full rounded-[1rem] object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveAnnouncement(item)}
                            disabled={pending === `edit-${item.id}`}
                            className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {item.image_url && (
                          <img
                            src={resolveAssetUrl(item.image_url)}
                            alt="Poster notification"
                            className="h-44 w-full rounded-[1.25rem] object-cover"
                          />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                              {getAudienceLabel(item.target_audience)}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                              {item.icon}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-neutral-950">{item.message}</p>
                          {item.link_url && (
                            <a
                              href={item.link_url}
                              target={item.link_url.startsWith("http") ? "_blank" : undefined}
                              rel={item.link_url.startsWith("http") ? "noreferrer" : undefined}
                              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-blue-700"
                            >
                              {item.cta_label || "Ouvrir le lien"}
                              <FiExternalLink />
                            </a>
                          )}
                          <p className="mt-2 text-xs text-neutral-500">
                            <FiClock className="mr-1 inline" />
                            Fin: {formatDate(item.expires_at)}
                          </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditAnnouncement(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700"
                            aria-label="Modifier"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAnnouncement(item)}
                            disabled={pending === `delete-${item.id}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600 disabled:opacity-50"
                            aria-label="Supprimer"
                          >
                            <FiTrash2 />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleAnnouncement(item)}
                            disabled={pending === item.id}
                            className="text-2xl text-blue-700 disabled:opacity-50"
                            aria-label="Activer ou desactiver"
                          >
                            {item.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                          </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                {!announcements.length && (
                  <div className="rounded-2xl bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                    Aucune notification publique pour le moment.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <FiTag />
                </span>
                <div>
                  <h2 className="font-semibold text-neutral-950">Promo sur annonce</h2>
                  <p className="text-xs text-neutral-500">Le badge apparait sur l'image du listing.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Logement
                  <select
                    value={selectedPropertyId}
                    onChange={(event) => setSelectedPropertyId(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title} - {property.city}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Texte promo
                    <input
                      value={promoLabel}
                      onChange={(event) => setPromoLabel(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Duree (heures)
                    <input
                      type="number"
                      min={1}
                      max={2160}
                      value={promoHours}
                      onChange={(event) => setPromoHours(Number(event.target.value))}
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void handleApplyPromo()}
                  disabled={!selectedProperty || pending === "promo"}
                  className="w-full rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pending === "promo" ? "Application..." : "Afficher la promo"}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {promoProperties.map((property) => (
                  <article key={property.id} className="rounded-2xl bg-neutral-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{property.title}</p>
                        <p className="mt-1 text-xs text-neutral-500">{property.city}</p>
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-700 px-3 py-1 text-[11px] font-semibold text-white">
                          <FiCheckCircle />
                          {property.promo_label}
                        </p>
                        <p className="mt-2 text-xs text-neutral-500">Fin: {formatDate(property.promo_until)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleClearPromo(property.id)}
                        disabled={pending === property.id}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 disabled:opacity-50"
                      >
                        Retirer
                      </button>
                    </div>
                  </article>
                ))}
                {!promoProperties.length && (
                  <div className="rounded-2xl bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                    Aucune promo active pour le moment.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {success && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </motion.section>
    </main>
  );
}
