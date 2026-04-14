"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiFileText, FiUploadCloud } from "react-icons/fi";
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

const STEPS: Step[] = [
  { title: "Infos propriétaire", subtitle: "Identité et contact" },
  { title: "Justificatifs", subtitle: "Documents et preuves" },
  { title: "Paiement", subtitle: "Coordonnées bancaires" },
];

type FileUploadFieldProps = {
  label: string;
  file: File | null;
  error?: string;
  accept?: string;
  capture?: "user" | "environment";
  onChange: (file: File | null) => void;
};

function FileUploadField({
  label,
  file,
  error,
  accept,
  capture,
  onChange,
}: FileUploadFieldProps) {
  return (
    <label className="block min-w-0 text-xs text-neutral-600">
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type="file"
        accept={accept}
        capture={capture}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="sr-only"
        aria-invalid={Boolean(error)}
      />
      <span
        className={`mt-2 flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 transition active:scale-[0.99] ${
          error
            ? "border-red-300 ring-2 ring-red-100"
            : file
              ? "border-blue-200 ring-2 ring-blue-50"
              : "border-neutral-200"
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            file ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {file ? <FiFileText /> : <FiUploadCloud />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-900">
            {file?.name ?? "Ajouter un fichier"}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
            {file ? "Fichier sélectionné" : "Photo, PDF ou document"}
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            file ? "bg-emerald-50 text-emerald-600" : "bg-neutral-950 text-white"
          }`}
        >
          {file ? <FiCheckCircle /> : "+"}
        </span>
      </span>
      {error && <span className="mt-1 block text-[11px] text-red-500">{error}</span>}
    </label>
  );
}

export default function NouveauBienPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [formValues, setFormValues] = useState<OwnerFormState>({
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
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OwnerFormState, string>>>(
    {},
  );
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();
  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);

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
    if (!user) return;
    setFormValues((prev) => ({
      ...prev,
      fullName: prev.fullName || user.full_name || "",
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
    }));
  }, [user]);

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
        className={`mx-auto max-w-3xl px-4 pb-28 pt-24 ${
          isVerifiedOwner ? "lg:ml-64 lg:max-w-[calc(100%-16rem)] lg:px-8" : ""
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-3xl bg-white p-5 shadow-soft sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Onboarding propriétaire
              </h1>
              <p className="mt-1 text-xs text-neutral-600">
                Complétez les informations avant de publier un bien.
              </p>
            </div>
            {user?.is_verified && (
              <Link
                href="/proprietaire"
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Retour
              </Link>
            )}
          </div>

          <div className="mt-6 min-w-0 overflow-hidden rounded-3xl border border-neutral-200 p-4 sm:p-5">
            <div className="relative">
              <div className="flex items-start justify-between gap-2 text-center">
                {STEPS.map((step, index) => {
                  const isActive = index === stepIndex;
                  const isDone = index < stepIndex;
                  const isFirst = index === 0;
                  const isLast = index === STEPS.length - 1;
                  return (
                    <div
                      key={step.title}
                      className="relative flex flex-1 flex-col items-center px-2"
                    >
                      {!isFirst && (
                        <>
                          <span className="absolute left-0 right-1/2 top-5 h-0.5 bg-neutral-200" />
                          <motion.span
                            className="absolute left-0 right-1/2 top-5 h-0.5 origin-right bg-blue-600"
                            initial={false}
                            animate={{ scaleX: index <= stepIndex ? 1 : 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                          />
                        </>
                      )}
                      {!isLast && (
                        <>
                          <span className="absolute left-1/2 right-0 top-5 h-0.5 bg-neutral-200" />
                          <motion.span
                            className="absolute left-1/2 right-0 top-5 h-0.5 origin-left bg-blue-600"
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
                            ? "0 0 0 6px rgba(37, 99, 235, 0.10)"
                            : "0 0 0 0 rgba(37, 99, 235, 0)",
                        }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold"
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
                        className="mt-3"
                        initial={false}
                        animate={{
                          opacity: isActive || isDone ? 1 : 0.7,
                          y: isActive ? 0 : 2,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <p
                          className={`text-xs font-semibold ${
                            isActive || isDone ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {step.subtitle}
                        </p>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 min-w-0 overflow-hidden rounded-2xl bg-neutral-50 p-3 sm:p-5">
              {stepIndex === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Nom complet
                    </span>
                    <input
                      value={formValues.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Téléphone
                    </span>
                    <input
                      value={formValues.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
                        errors.phone ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone && (
                      <span className="text-[11px] text-red-500">{errors.phone}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Email
                    </span>
                    <input
                      type="email"
                      value={formValues.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
                        errors.email ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && (
                      <span className="text-[11px] text-red-500">{errors.email}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Ville principale
                    </span>
                    <input
                      value={formValues.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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
                    onChange={(file) => updateField("identityFile", file)}
                  />
                  <FileUploadField
                    label="Selfie de vérification"
                    file={formValues.selfieFile}
                    error={errors.selfieFile}
                    accept="image/*"
                    capture="user"
                    onChange={(file) => updateField("selfieFile", file)}
                  />
                  <FileUploadField
                    label="Justificatif de propriété"
                    file={formValues.propertyFile}
                    error={errors.propertyFile}
                    onChange={(file) => updateField("propertyFile", file)}
                  />
                  <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Adresse du bien principal
                    </span>
                    <input
                      value={formValues.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Nom de la banque
                    </span>
                    <input
                      value={formValues.bankName}
                      onChange={(event) => updateField("bankName", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Numéro de compte
                    </span>
                    <input
                      value={formValues.accountNumber}
                      onChange={(event) => updateField("accountNumber", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Mobile money
                    </span>
                    <input
                      value={formValues.mobileMoney}
                      onChange={(event) => updateField("mobileMoney", event.target.value)}
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Nom du titulaire
                    </span>
                    <input
                      value={formValues.accountHolder}
                      onChange={(event) =>
                        updateField("accountHolder", event.target.value)
                      }
                      className={`rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2 ${
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

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                disabled={stepIndex === 0}
              >
                Précédent
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">
                  Étape {stepIndex + 1} / {STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting}
                  className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
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

