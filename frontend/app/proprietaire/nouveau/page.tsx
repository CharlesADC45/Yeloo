"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FiCamera,
  FiCheckCircle,
  FiFileText,
  FiImage,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { CelebrationModal } from "@/components/CelebrationModal";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type Step = {
  title: string;
  subtitle: string;
};

type OwnerFormState = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  identityFile: File | null;
  selfieFile: File | null;
  propertyFile: File | null;
  address: string;
  bankName: string;
  accountNumber: string;
  mobileMoney: string;
  accountHolder: string;
};

type OwnerDraftPayload = {
  stepIndex: number;
  formValues: OwnerFormState;
  updatedAt: string;
};

const STEPS: Step[] = [
  { title: "Infos propriétaire", subtitle: "Identité et contact" },
  { title: "Justificatifs", subtitle: "Documents et preuves" },
  { title: "Paiement", subtitle: "Coordonnées bancaires" },
];

const EMPTY_FORM_VALUES: OwnerFormState = {
  fullName: "",
  phone: "",
  email: "",
  city: "",
  identityFile: null,
  selfieFile: null,
  propertyFile: null,
  address: "",
  bankName: "",
  accountNumber: "",
  mobileMoney: "",
  accountHolder: "",
};

const OWNER_DRAFT_DB_NAME = "yeloo-owner-onboarding";
const OWNER_DRAFT_STORE = "drafts";

function openOwnerDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }

    const request = indexedDB.open(OWNER_DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OWNER_DRAFT_STORE)) {
        db.createObjectStore(OWNER_DRAFT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Brouillon inaccessible"));
  });
}

async function readOwnerDraft(key: string) {
  const db = await openOwnerDraftDb();
  return new Promise<OwnerDraftPayload | null>((resolve, reject) => {
    const transaction = db.transaction(OWNER_DRAFT_STORE, "readonly");
    const store = transaction.objectStore(OWNER_DRAFT_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as OwnerDraftPayload | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Lecture du brouillon impossible"));
    transaction.oncomplete = () => db.close();
  });
}

async function writeOwnerDraft(key: string, payload: OwnerDraftPayload) {
  const db = await openOwnerDraftDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OWNER_DRAFT_STORE, "readwrite");
    const store = transaction.objectStore(OWNER_DRAFT_STORE);
    const request = store.put(payload, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Sauvegarde du brouillon impossible"));
    transaction.oncomplete = () => db.close();
  });
}

async function removeOwnerDraft(key: string) {
  const db = await openOwnerDraftDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OWNER_DRAFT_STORE, "readwrite");
    const store = transaction.objectStore(OWNER_DRAFT_STORE);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Nettoyage du brouillon impossible"));
    transaction.oncomplete = () => db.close();
  });
}

type FileUploadFieldProps = {
  label: string;
  file: File | null;
  error?: string;
  accept?: string;
  cameraCapture?: "user" | "environment";
  allowCamera?: boolean;
  onChange: (file: File | null) => void;
};

function FileUploadField({
  label,
  file,
  error,
  accept,
  cameraCapture = "environment",
  allowCamera = true,
  onChange,
}: FileUploadFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (nextFile: File | null) => {
    onChange(nextFile);
    setIsPickerOpen(false);
  };

  return (
    <div className="block min-w-0 text-xs text-neutral-600">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </span>
      <input
        ref={uploadInputRef}
        type="file"
        accept={accept}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        className="sr-only"
        aria-invalid={Boolean(error)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={cameraCapture}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        className="sr-only"
        aria-invalid={Boolean(error)}
      />
      <button
        type="button"
        onClick={() => setIsPickerOpen((value) => !value)}
        className={`mt-2 flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 py-3 transition active:scale-[0.99] ${
          error
            ? "border-red-300 ring-2 ring-red-100"
            : file
              ? "border-blue-200 ring-2 ring-blue-50"
              : "border-neutral-200"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            file ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {file ? <FiFileText /> : <FiUploadCloud />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-neutral-900">
            {file?.name ?? "Ajouter un fichier"}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-neutral-500">
            {file ? "Fichier sélectionné" : "Photo, PDF ou document"}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            file ? "bg-emerald-50 text-emerald-600" : "bg-neutral-950 text-white"
          }`}
        >
          {file ? "OK" : "Choisir"}
        </span>
      </button>
      {isPickerOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 grid gap-2 rounded-2xl bg-neutral-50 p-2"
        >
          {allowCamera && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-left text-xs font-semibold text-neutral-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiCamera />
              </span>
              Prendre une photo
            </button>
          )}
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-left text-xs font-semibold text-neutral-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
              <FiImage />
            </span>
            Uploader depuis le téléphone
          </button>
          {file && (
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-left text-xs font-semibold text-red-600"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <FiX />
              </span>
              Retirer le fichier
            </button>
          )}
        </motion.div>
      )}
      {error && <span className="mt-1 block text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

export default function NouveauBienPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved" | "unavailable">("idle");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [formValues, setFormValues] = useState<OwnerFormState>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof OwnerFormState, string>>>(
    {},
  );
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();
  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);
  const draftKey = useMemo(
    () => `owner-onboarding:${user?.id || user?.email || "guest"}`,
    [user?.email, user?.id]
  );

  const updateField = <Key extends keyof OwnerFormState>(
    field: Key,
    value: OwnerFormState[Key],
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  useEffect(() => {
    let active = true;
    setIsDraftLoaded(false);
    setDraftStatus("idle");

    const loadDraft = async () => {
      try {
        const draft = await readOwnerDraft(draftKey);
        if (!active) return;

        if (draft) {
          setFormValues({ ...EMPTY_FORM_VALUES, ...draft.formValues });
          setStepIndex(Math.min(Math.max(draft.stepIndex, 0), STEPS.length - 1));
          setDraftStatus("saved");
        } else {
          setFormValues(EMPTY_FORM_VALUES);
        }
      } catch {
        if (active) {
          setDraftStatus("unavailable");
        }
      } finally {
        if (active) {
          setIsDraftLoaded(true);
        }
      }
    };

    void loadDraft();

    return () => {
      active = false;
    };
  }, [draftKey]);

  useEffect(() => {
    if (!user || !isDraftLoaded) return;
    setFormValues((prev) => ({
      ...prev,
      fullName: prev.fullName || user.full_name || "",
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
    }));
  }, [isDraftLoaded, user]);

  useEffect(() => {
    if (!isDraftLoaded || isCompleted) return;

    const timer = window.setTimeout(() => {
      void writeOwnerDraft(draftKey, {
        stepIndex,
        formValues,
        updatedAt: new Date().toISOString(),
      })
        .then(() => setDraftStatus("saved"))
        .catch(() => setDraftStatus("unavailable"));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [draftKey, formValues, isCompleted, isDraftLoaded, stepIndex]);

  useEffect(() => {
    if (!shouldRedirect) return;
    const timer = window.setTimeout(() => {
      router.push("/proprietaire");
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [shouldRedirect, router]);

  const handleCelebrationClose = () => {
    setShouldRedirect(false);
    router.push("/proprietaire");
  };

  const validateStep = (index: number) => {
    const nextErrors: Partial<Record<keyof OwnerFormState, string>> = {};
    const requiredFieldsByStep: Array<Array<keyof OwnerFormState>> = [
      ["fullName", "phone", "email", "city"],
      ["identityFile", "selfieFile", "propertyFile", "address"],
      ["bankName", "accountNumber", "mobileMoney", "accountHolder"],
    ];
    requiredFieldsByStep[index]?.forEach((field) => {
      const value = formValues[field];
      const isEmpty =
        typeof value === "string" ? value.trim().length === 0 : value === null;
      if (isEmpty) {
        nextErrors[field] = "Champ requis";
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitOnboarding = async () => {
    if (!token) {
      setSubmitError("Connectez-vous avant de continuer.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    setShouldRedirect(false);
    try {
      const formData = new FormData();
      formData.append("full_name", formValues.fullName.trim());
      formData.append("phone", formValues.phone.trim());
      formData.append("email", formValues.email.trim());
      formData.append("city", formValues.city.trim());
      formData.append("address", formValues.address.trim());
      formData.append("bank_name", formValues.bankName.trim());
      formData.append("account_number", formValues.accountNumber.trim());
      formData.append("mobile_money", formValues.mobileMoney.trim());
      formData.append("account_holder", formValues.accountHolder.trim());
      if (formValues.identityFile) {
        formData.append("identity_doc", formValues.identityFile);
      }
      if (formValues.selfieFile) {
        formData.append("identity_selfie", formValues.selfieFile);
      }
      if (formValues.propertyFile) {
        formData.append("property_doc", formValues.propertyFile);
      }

      const response = await fetch(`${getApiBaseUrl()}/api/owners/onboarding`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload?.detail ||
          payload?.message ||
          `Erreur API (${response.status})`;
        throw new Error(detail);
      }

      await response.json();
      await removeOwnerDraft(draftKey).catch(() => undefined);

      const meResponse = await fetch(`${getApiBaseUrl()}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (meResponse.ok) {
        const user = await meResponse.json();
        setUser({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
          profile_image_url: user.profile_image_url,
          is_verified: user.is_verified,
          owner_verification_status: user.owner_verification_status,
        });
      }

      setIsCompleted(true);
      setShouldRedirect(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible d'enregistrer.";
      setSubmitError(message);
      setIsCompleted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    if (!validateStep(stepIndex)) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
      return;
    }
    await submitOnboarding();
  };

  const goPrev = () => {
    setErrors({});
    setIsCompleted(false);
    setSubmitError(null);
    setShouldRedirect(false);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      {isVerifiedOwner && <OwnerSidebar />}
      <main
        className={`mx-auto max-w-3xl px-3 pb-36 pt-20 sm:px-4 sm:pt-24 ${
          isVerifiedOwner ? "lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8" : ""
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white px-1 py-3 sm:rounded-3xl sm:p-6 sm:shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 sm:px-0">
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Onboarding propriétaire
              </h1>
              <p className="mt-1 text-xs text-neutral-600">
                Complétez les informations avant de publier un bien.
              </p>
              <p
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                  draftStatus === "unavailable"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {draftStatus === "unavailable"
                  ? "Sauvegarde locale indisponible"
                  : "Brouillon sauvegardé automatiquement"}
              </p>
            </div>
            {user?.is_verified && (
              <Link
                href="/proprietaire"
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700"
              >
                Retour
              </Link>
            )}
          </div>

          <div className="mt-5 min-w-0 overflow-visible sm:rounded-3xl sm:border sm:border-neutral-200 sm:p-5">
            <div className="relative">
              <div className="flex items-start justify-between gap-1 text-center sm:gap-2">
                {STEPS.map((step, index) => {
                  const isActive = index === stepIndex;
                  const isDone = index < stepIndex;
                  const isFirst = index === 0;
                  const isLast = index === STEPS.length - 1;
                  return (
                    <div
                      key={step.title}
                      className="relative flex flex-1 flex-col items-center px-0.5 sm:px-2"
                    >
                      {!isFirst && (
                        <>
                          <span className="absolute left-0 right-1/2 top-4 h-0.5 bg-neutral-200 sm:top-5" />
                          <motion.span
                            className="absolute left-0 right-1/2 top-4 h-0.5 origin-right bg-blue-600 sm:top-5"
                            initial={false}
                            animate={{ scaleX: index <= stepIndex ? 1 : 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                          />
                        </>
                      )}
                      {!isLast && (
                        <>
                          <span className="absolute left-1/2 right-0 top-4 h-0.5 bg-neutral-200 sm:top-5" />
                          <motion.span
                            className="absolute left-1/2 right-0 top-4 h-0.5 origin-left bg-blue-600 sm:top-5"
                            initial={false}
                            animate={{ scaleX: index < stepIndex ? 1 : 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                          />
                        </>
                      )}
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isActive ? 1.08 : 1,
                          backgroundColor: isDone ? "#2563eb" : "#ffffff",
                          borderColor: isDone || isActive ? "#2563eb" : "#d4d4d8",
                          color: isDone
                            ? "#ffffff"
                            : isActive
                              ? "#2563eb"
                              : "#a3a3a3",
                          boxShadow: isActive
                            ? "0 0 0 4px rgba(37, 99, 235, 0.10)"
                            : "0 0 0 0 rgba(37, 99, 235, 0)",
                        }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-semibold sm:h-10 sm:w-10 sm:text-xs"
                      >
                        <motion.span
                          key={`${step.title}-${isDone}-${isActive}`}
                          initial={{ opacity: 0.3, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.18 }}
                        >
                          {isDone ? "\u2713" : index + 1}
                        </motion.span>
                      </motion.div>
                      <motion.div
                        className="mt-2 sm:mt-3"
                        initial={false}
                        animate={{
                          opacity: isActive || isDone ? 1 : 0.7,
                          y: isActive ? 0 : 2,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <p
                          className={`text-[11px] font-semibold leading-tight sm:text-xs ${
                            isActive || isDone ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="mt-0.5 hidden text-[11px] leading-tight text-neutral-400 min-[405px]:block">
                          {step.subtitle}
                        </p>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 min-w-0 overflow-visible sm:rounded-2xl sm:bg-neutral-50 sm:p-5">
              {stepIndex === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Nom complet
                    </span>
                    <input
                      value={formValues.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.fullName ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.fullName)}
                    />
                    {errors.fullName && (
                      <span className="text-[11px] text-red-500">
                        {errors.fullName}
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Téléphone
                    </span>
                    <input
                      value={formValues.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.phone ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone && (
                      <span className="text-[11px] text-red-500">{errors.phone}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Email
                    </span>
                    <input
                      type="email"
                      value={formValues.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.email ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && (
                      <span className="text-[11px] text-red-500">{errors.email}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Ville principale
                    </span>
                    <input
                      value={formValues.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.city ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.city)}
                    />
                    {errors.city && (
                      <span className="text-[11px] text-red-500">{errors.city}</span>
                    )}
                  </label>
                </div>
              )}

              {stepIndex === 1 && (
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <FileUploadField
                    label="Pièce d'identité"
                    file={formValues.identityFile}
                    error={errors.identityFile}
                    accept="image/*,.pdf"
                    cameraCapture="environment"
                    onChange={(file) => updateField("identityFile", file)}
                  />
                  <FileUploadField
                    label="Selfie de vérification"
                    file={formValues.selfieFile}
                    error={errors.selfieFile}
                    accept="image/*"
                    cameraCapture="user"
                    onChange={(file) => updateField("selfieFile", file)}
                  />
                  <FileUploadField
                    label="Justificatif de propriété"
                    file={formValues.propertyFile}
                    error={errors.propertyFile}
                    accept="image/*,.pdf"
                    cameraCapture="environment"
                    onChange={(file) => updateField("propertyFile", file)}
                  />
                  <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Adresse du bien principal
                    </span>
                    <input
                      value={formValues.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.address ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.address)}
                    />
                    {errors.address && (
                      <span className="text-[11px] text-red-500">{errors.address}</span>
                    )}
                  </label>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Nom de la banque
                    </span>
                    <input
                      value={formValues.bankName}
                      onChange={(event) => updateField("bankName", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.bankName ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.bankName)}
                    />
                    {errors.bankName && (
                      <span className="text-[11px] text-red-500">
                        {errors.bankName}
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Numéro de compte
                    </span>
                    <input
                      value={formValues.accountNumber}
                      onChange={(event) => updateField("accountNumber", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.accountNumber
                          ? "border-red-300 ring-red-200"
                          : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.accountNumber)}
                    />
                    {errors.accountNumber && (
                      <span className="text-[11px] text-red-500">
                        {errors.accountNumber}
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Mobile money
                    </span>
                    <input
                      value={formValues.mobileMoney}
                      onChange={(event) => updateField("mobileMoney", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.mobileMoney
                          ? "border-red-300 ring-red-200"
                          : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.mobileMoney)}
                    />
                    {errors.mobileMoney && (
                      <span className="text-[11px] text-red-500">
                        {errors.mobileMoney}
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Nom du titulaire
                    </span>
                    <input
                      value={formValues.accountHolder}
                      onChange={(event) =>
                        updateField("accountHolder", event.target.value)
                      }
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.accountHolder
                          ? "border-red-300 ring-red-200"
                          : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.accountHolder)}
                    />
                    {errors.accountHolder && (
                      <span className="text-[11px] text-red-500">
                        {errors.accountHolder}
                      </span>
                    )}
                  </label>
                </div>
              )}
            </div>

            {submitError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {submitError}
              </div>
            )}

            <div className="sticky bottom-24 -mx-1 mt-6 flex items-center justify-between gap-3 border-t border-neutral-100 bg-white/96 px-1 py-3 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-0">
              <button
                type="button"
                onClick={goPrev}
                className="min-h-11 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-40"
                disabled={stepIndex === 0}
              >
                Précédent
              </button>
              <div className="flex min-w-0 items-center gap-2">
                <span className="hidden text-xs text-neutral-500 min-[380px]:inline">
                  Étape {stepIndex + 1} / {STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting}
                  className="min-h-11 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLastStep ? (isSubmitting ? "Envoi..." : "Terminer") : "Suivant"}
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      <CelebrationModal
        open={isCompleted}
        title="Demande envoyée"
        message="Bravo, votre dossier propriétaire est parti pour validation. On vous tient au courant dès que le super admin confirme votre vérification."
        actionLabel="Voir mon espace"
        onClose={handleCelebrationClose}
      />
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

