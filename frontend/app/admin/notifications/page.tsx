"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import {
  FiBell,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiImage,
  FiInfo,
  FiTag,
  FiTool,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
} from "react-icons/fi";
import {
  type AdminPropertySummary,
  type PublicAnnouncement,
  createPublicAnnouncement,
  deletePublicAnnouncement,
  fetchAdminProperties,
  fetchPublicAnnouncementsAdmin,
  updateAdminPropertyPromo,
  updatePublicAnnouncement,
  uploadPublicAnnouncementImage,
} from "@/lib/admin";
import { getApiBaseUrl } from "@/lib/api";
import { PublicAnnouncementCard } from "@/components/PublicAnnouncementCard";
import { useAuthStore } from "@/stores/authStore";

const iconOptions = [
  { value: "info", label: "Info", Icon: FiInfo },
  { value: "maintenance", label: "Maintenance", Icon: FiTool },
  { value: "promo", label: "Promo", Icon: FiTag },
  { value: "alert", label: "Alerte", Icon: FiBell },
] as const;

const audienceOptions = [
  { value: "all", label: "Tout le monde" },
  { value: "locataire", label: "Locataires" },
  { value: "proprietaire", label: "Proprietaires" },
] as const;

const modeOptions = [
  { value: "text", label: "Annonce normale", description: "Texte simple, rapide a publier." },
  {
    value: "poster_auto",
    label: "Poster auto",
    description: "Image plein format avec mise en page Yeloo automatique.",
  },
  {
    value: "poster_manual",
    label: "Poster manuel",
    description: "Image + texte avec police, taille, couleur et position personnalisees.",
  },
] as const;

const fontOptions = [
  { value: "display", label: "Display" },
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
] as const;

const sizeOptions = [
  { value: "sm", label: "Petit" },
  { value: "md", label: "Moyen" },
  { value: "lg", label: "Grand" },
  { value: "xl", label: "XL" },
] as const;

const positionOptions = [
  { value: "left", label: "Gauche" },
  { value: "right", label: "Droite" },
  { value: "top", label: "Haut" },
  { value: "bottom", label: "Bas" },
  { value: "center", label: "Centre" },
] as const;

const insetOptions = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Confort" },
  { value: "airy", label: "Aere" },
] as const;

const overlayOptions = [
  { value: "soft", label: "Leger" },
  { value: "medium", label: "Moyen" },
  { value: "strong", label: "Fort" },
] as const;

type AnnouncementAudience = (typeof audienceOptions)[number]["value"];
type AnnouncementMode = (typeof modeOptions)[number]["value"];
type PosterFont = (typeof fontOptions)[number]["value"];
type PosterSize = (typeof sizeOptions)[number]["value"];
type PosterPosition = (typeof positionOptions)[number]["value"];
type PosterInset = (typeof insetOptions)[number]["value"];
type PosterOverlay = (typeof overlayOptions)[number]["value"];

type AnnouncementFormState = {
  message: string;
  icon: string;
  displayMode: AnnouncementMode;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string;
  fontFamily: PosterFont;
  textColor: string;
  textSize: PosterSize;
  textPosition: PosterPosition;
  contentInset: PosterInset;
  overlayStrength: PosterOverlay;
  targetAudience: AnnouncementAudience;
  durationHours: number;
};

const DEFAULT_FORM: AnnouncementFormState = {
  message: "Maintenance de 1h programmee pour ce soir 23h50. Merci.",
  icon: "maintenance",
  displayMode: "text",
  imageUrl: "",
  linkUrl: "",
  ctaLabel: "En savoir plus",
  fontFamily: "display",
  textColor: "#ffffff",
  textSize: "md",
  textPosition: "left",
  contentInset: "comfortable",
  overlayStrength: "medium",
  targetAudience: "all",
  durationHours: 24,
};

const EMPTY_EDIT_FORM: AnnouncementFormState = {
  ...DEFAULT_FORM,
  message: "",
  icon: "info",
};

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

const getModeLabel = (value: AnnouncementMode) =>
  modeOptions.find((option) => option.value === value)?.label || "Annonce normale";

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  return `${getApiBaseUrl()}${value}`;
};

function ModeSelector({
  value,
  onChange,
  compact = false,
}: {
  value: AnnouncementMode;
  onChange: (value: AnnouncementMode) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-3" : ""}`}>
      {modeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
            value === option.value
              ? "border-blue-500 bg-blue-50"
              : "border-neutral-200 bg-neutral-50 hover:border-blue-200"
          }`}
        >
          <p className="text-sm font-semibold text-neutral-950">{option.label}</p>
          <p className="mt-1 text-xs text-neutral-500">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function ManualPosterControls({
  form,
  onChange,
}: {
  form: AnnouncementFormState;
  onChange: (patch: Partial<AnnouncementFormState>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Police
        <select
          value={form.fontFamily}
          onChange={(event) => onChange({ fontFamily: event.target.value as PosterFont })}
          className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {fontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Taille du texte
        <select
          value={form.textSize}
          onChange={(event) => onChange({ textSize: event.target.value as PosterSize })}
          className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {sizeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Position
        <select
          value={form.textPosition}
          onChange={(event) => onChange({ textPosition: event.target.value as PosterPosition })}
          className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {positionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Espacement
        <select
          value={form.contentInset}
          onChange={(event) => onChange({ contentInset: event.target.value as PosterInset })}
          className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {insetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Contraste du fond
        <select
          value={form.overlayStrength}
          onChange={(event) => onChange({ overlayStrength: event.target.value as PosterOverlay })}
          className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {overlayOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Couleur du texte
        <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-neutral-200 px-3">
          <input
            type="color"
            value={form.textColor}
            onChange={(event) => onChange({ textColor: event.target.value })}
            className="h-8 w-10 rounded-md border border-neutral-200 bg-transparent"
          />
          <input
            value={form.textColor}
            onChange={(event) => onChange({ textColor: event.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
          />
        </div>
      </label>
    </div>
  );
}

function PosterUploader({
  inputRef,
  pending,
  imageUrl,
  onUpload,
  onRemove,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  pending: boolean;
  imageUrl: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Image du poster</p>
          <p className="mt-1 text-xs text-neutral-500">
            Ajoute une image large. Elle couvrira toute la carte du carousel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-60"
          >
            <FiImage />
            {pending ? "Upload..." : "Ajouter un poster"}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-neutral-500"
            >
              Retirer
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef as RefObject<HTMLInputElement>}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.currentTarget.value = "";
        }}
      />
      {imageUrl && (
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-neutral-200 bg-white">
          <img src={resolveAssetUrl(imageUrl)} alt="Poster notification" className="h-44 w-full object-cover" />
        </div>
      )}
    </div>
  );
}

export default function AdminNotificationsPage() {
  const token = useAuthStore((state) => state.token);
  const createImageInputRef = useRef<HTMLInputElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [properties, setProperties] = useState<AdminPropertySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<AnnouncementFormState>(DEFAULT_FORM);
  const [isActive, setIsActive] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [promoLabel, setPromoLabel] = useState("Promo speciale");
  const [promoHours, setPromoHours] = useState(72);
  const [pending, setPending] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AnnouncementFormState>(EMPTY_EDIT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const promoProperties = useMemo(() => properties.filter((property) => property.promo_label), [properties]);

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

  const validateAnnouncementForm = (currentForm: AnnouncementFormState) => {
    if (currentForm.displayMode !== "text" && !currentForm.imageUrl.trim()) {
      setError("Ajoute une image pour publier un poster.");
      return false;
    }
    return true;
  };

  const handleCreateAnnouncement = async () => {
    if (!token) return;
    setPending("announcement");
    setError(null);
    setSuccess(null);
    if (!validateAnnouncementForm(form)) {
      setPending(null);
      return;
    }
    try {
      const created = await createPublicAnnouncement(token, {
        message: form.message,
        icon: form.icon,
        display_mode: form.displayMode,
        image_url: form.imageUrl.trim() || null,
        link_url: form.linkUrl.trim() || null,
        cta_label: form.ctaLabel.trim() || null,
        font_family: form.fontFamily,
        text_color: form.textColor,
        text_size: form.textSize,
        text_position: form.textPosition,
        content_inset: form.contentInset,
        overlay_strength: form.overlayStrength,
        target_audience: form.targetAudience,
        duration_hours: form.durationHours,
        is_active: isActive,
      });
      setAnnouncements((current) => [created, ...current]);
      setForm(DEFAULT_FORM);
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
      displayMode: item.display_mode || "text",
      imageUrl: item.image_url || "",
      linkUrl: item.link_url || "",
      ctaLabel: item.cta_label || "",
      fontFamily: (item.font_family as PosterFont) || "display",
      textColor: item.text_color || "#ffffff",
      textSize: (item.text_size as PosterSize) || "md",
      textPosition: (item.text_position as PosterPosition) || "left",
      contentInset: (item.content_inset as PosterInset) || "comfortable",
      overlayStrength: (item.overlay_strength as PosterOverlay) || "medium",
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
    if (!validateAnnouncementForm(editForm)) {
      setPending(null);
      return;
    }
    try {
      const updated = await updatePublicAnnouncement(token, item.id, {
        message: editForm.message,
        icon: editForm.icon,
        display_mode: editForm.displayMode,
        image_url: editForm.imageUrl.trim() || null,
        link_url: editForm.linkUrl.trim() || null,
        cta_label: editForm.ctaLabel.trim() || null,
        font_family: editForm.fontFamily,
        text_color: editForm.textColor,
        text_size: editForm.textSize,
        text_position: editForm.textPosition,
        content_inset: editForm.contentInset,
        overlay_strength: editForm.overlayStrength,
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
        setForm((current) => ({ ...current, imageUrl: payload.url }));
      } else {
        setEditForm((current) => ({ ...current, imageUrl: payload.url }));
      }
      setSuccess("Poster ajoute.");
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
                <ModeSelector
                  value={form.displayMode}
                  onChange={(value) => setForm((current) => ({ ...current, displayMode: value }))}
                />

                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Texte
                  <textarea
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                {form.displayMode === "poster_manual" && (
                  <ManualPosterControls
                    form={form}
                    onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Lien (optionnel)
                    <input
                      type="url"
                      value={form.linkUrl}
                      onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
                      placeholder="https://yeloo.ci/promo"
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Texte du bouton
                    <input
                      value={form.ctaLabel}
                      onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))}
                      placeholder="En savoir plus"
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>

                {form.displayMode !== "text" && (
                  <PosterUploader
                    inputRef={createImageInputRef}
                    pending={pending === "upload-image"}
                    imageUrl={form.imageUrl}
                    onUpload={(file) => void handleUploadAnnouncementImage(file, "create")}
                    onRemove={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Type
                    <div className="mt-2 flex h-12 items-center rounded-2xl border border-neutral-200 px-4 text-sm font-semibold normal-case tracking-normal text-neutral-900">
                      {getModeLabel(form.displayMode)}
                    </div>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Icone
                    <select
                      value={form.icon}
                      onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
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
                      value={form.targetAudience}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, targetAudience: event.target.value as AnnouncementAudience }))
                      }
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
                      value={form.durationHours}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, durationHours: Number(event.target.value) }))
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Apercu live</p>
                  <PublicAnnouncementCard
                    preview
                    audienceLabel={getAudienceLabel(form.targetAudience)}
                    announcement={{
                      id: "preview",
                      message: form.message || "Ton message apparaitra ici.",
                      icon: form.icon,
                      display_mode: form.displayMode,
                      image_url: form.imageUrl || null,
                      link_url: form.linkUrl || null,
                      cta_label: form.ctaLabel || null,
                      font_family: form.fontFamily,
                      text_color: form.textColor,
                      text_size: form.textSize,
                      text_position: form.textPosition,
                      content_inset: form.contentInset,
                      overlay_strength: form.overlayStrength,
                    }}
                  />
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

              <div className="mt-6 space-y-4">
                {announcements.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-neutral-50 p-4">
                    {editingId === item.id ? (
                      <div className="space-y-4">
                        <ModeSelector
                          compact
                          value={editForm.displayMode}
                          onChange={(value) => setEditForm((current) => ({ ...current, displayMode: value }))}
                        />

                        <textarea
                          value={editForm.message}
                          onChange={(event) => setEditForm((current) => ({ ...current, message: event.target.value }))}
                          rows={3}
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        {editForm.displayMode === "poster_manual" && (
                          <ManualPosterControls
                            form={editForm}
                            onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
                          />
                        )}

                        <div className="grid gap-3 sm:grid-cols-4">
                          <select
                            value={editForm.icon}
                            onChange={(event) => setEditForm((current) => ({ ...current, icon: event.target.value }))}
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
                              setEditForm((current) => ({ ...current, durationHours: Number(event.target.value) }))
                            }
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                          <div className="flex h-11 items-center rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900">
                            {getModeLabel(editForm.displayMode)}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                          <input
                            type="url"
                            value={editForm.linkUrl}
                            onChange={(event) => setEditForm((current) => ({ ...current, linkUrl: event.target.value }))}
                            placeholder="https://yeloo.ci/promo"
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                          <input
                            value={editForm.ctaLabel}
                            onChange={(event) => setEditForm((current) => ({ ...current, ctaLabel: event.target.value }))}
                            placeholder="Texte du bouton"
                            className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                        </div>

                        {editForm.displayMode !== "text" && (
                          <PosterUploader
                            inputRef={editImageInputRef}
                            pending={pending === "edit-upload-image"}
                            imageUrl={editForm.imageUrl}
                            onUpload={(file) => void handleUploadAnnouncementImage(file, "edit")}
                            onRemove={() => setEditForm((current) => ({ ...current, imageUrl: "" }))}
                          />
                        )}

                        <PublicAnnouncementCard
                          preview
                          audienceLabel={getAudienceLabel(editForm.targetAudience)}
                          announcement={{
                            id: item.id,
                            message: editForm.message || "Ton message apparaitra ici.",
                            icon: editForm.icon,
                            display_mode: editForm.displayMode,
                            image_url: editForm.imageUrl || null,
                            link_url: editForm.linkUrl || null,
                            cta_label: editForm.ctaLabel || null,
                            font_family: editForm.fontFamily,
                            text_color: editForm.textColor,
                            text_size: editForm.textSize,
                            text_position: editForm.textPosition,
                            content_inset: editForm.contentInset,
                            overlay_strength: editForm.overlayStrength,
                          }}
                        />

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
                        <PublicAnnouncementCard
                          preview
                          audienceLabel={getAudienceLabel(item.target_audience)}
                          announcement={item}
                        />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                              {getModeLabel(item.display_mode || "text")}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                              {item.icon}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                              <FiClock className="mr-1 inline" />
                              Fin: {formatDate(item.expires_at)}
                            </span>
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
