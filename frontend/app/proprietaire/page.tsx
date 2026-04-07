"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { OwnerDashboardSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type OwnerProfile = {
  id: string;
  city: string;
  main_address: string;
  bank_name: string;
  account_number: string;
  mobile_money: string;
  account_holder: string;
  identity_doc_name?: string | null;
  identity_selfie_name?: string | null;
  property_proof_name?: string | null;
  verification_status: string;
  verification_notes?: string | null;
  reviewed_at?: string | null;
};

type OwnerProperty = {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;
  price_period: string;
  status: string;
  views_count: number;
  created_at: string;
};

export default function ProprietairePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canViewDashboard, setCanViewDashboard] = useState<boolean | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const dashboardRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let isMounted = true;

    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);
      setCanViewDashboard(null);
      setRedirectTarget(null);
      try {
        const meResponse = await fetch(`${getApiBaseUrl()}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meResponse.ok) {
          if (isMounted) {
            setCanViewDashboard(false);
            setRedirectTarget("/");
          }
          return;
        }

        const nextUser = await meResponse.json();
        if (isMounted) {
          setUser({
            id: nextUser.id,
            email: nextUser.email,
            full_name: nextUser.full_name,
            phone: nextUser.phone,
            role: nextUser.role,
            profile_image_url: nextUser.profile_image_url,
            is_verified: nextUser.is_verified,
            owner_verification_status: nextUser.owner_verification_status,
          });
        }

        const nextIsOwnerRole =
          nextUser.role === "proprietaire" || nextUser.role === "admin";

        if (!nextIsOwnerRole) {
          if (isMounted) {
            setCanViewDashboard(false);
            setRedirectTarget("/");
          }
          return;
        }

        const [profileResponse, propertiesResponse] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/owners/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${getApiBaseUrl()}/api/properties/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!propertiesResponse.ok) {
          const payload = await propertiesResponse.json().catch(() => null);
          const detail =
            payload?.detail || payload?.message || `Erreur API (${propertiesResponse.status})`;
          throw new Error(detail);
        }

        const propertyData = (await propertiesResponse.json()) as OwnerProperty[];
        const profileData =
          profileResponse.ok && profileResponse.status !== 204
            ? ((await profileResponse.json()) as OwnerProfile)
            : null;

        if (!profileResponse.ok && profileResponse.status === 404 && nextUser.role === "proprietaire") {
          if (isMounted) {
            setCanViewDashboard(false);
            setRedirectTarget("/proprietaire/nouveau");
          }
          return;
        }

        if (isMounted) {
          setProperties(Array.isArray(propertyData) ? propertyData : []);
          setProfile(profileData);
          setCanViewDashboard(true);
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Impossible de charger le dashboard.";
        setError(message);
        setCanViewDashboard(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, router, setUser, token]);

  useEffect(() => {
    if (!redirectTarget) return;
    router.replace(redirectTarget);
  }, [redirectTarget, router]);

  useEffect(() => {
    if (isLoading || canViewDashboard !== true) return;

    const cleanupFns: Array<() => void> = [];
    const context = gsap.context(() => {
      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-owner-reveal]"),
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.52,
          stagger: 0.06,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-owner-bar]"),
        { scaleY: 0.25, transformOrigin: "bottom center", opacity: 0.45 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.6,
          stagger: 0.05,
          ease: "back.out(1.6)",
        }
      );

      const liftItems = gsap.utils.toArray<HTMLElement>("[data-owner-lift]");
      liftItems.forEach((item) => {
        const onEnter = () => {
          gsap.to(item, {
            y: -6,
            boxShadow: "0 22px 40px rgba(37, 99, 235, 0.11)",
            duration: 0.25,
            ease: "power3.out",
          });
        };
        const onLeave = () => {
          gsap.to(item, {
            y: 0,
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
            duration: 0.26,
            ease: "power2.out",
          });
        };

        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);
        cleanupFns.push(() => {
          item.removeEventListener("mouseenter", onEnter);
          item.removeEventListener("mouseleave", onLeave);
        });
      });
    }, dashboardRootRef);

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, [canViewDashboard, isLoading]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <h1 className="text-lg font-semibold">Accès propriétaire</h1>
            <p className="mt-2 text-xs text-neutral-600">
              Connectez-vous pour accéder à votre espace.
            </p>
            <Link
              href="/connexion"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Aller à la connexion
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (canViewDashboard === false) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <h1 className="text-lg font-semibold">Redirection en cours…</h1>
            <p className="mt-2 text-sm text-neutral-600">
              On vous redirige vers la bonne page.
            </p>
            <Link
              href={redirectTarget || "/"}
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Continuer
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (canViewDashboard === null) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <OwnerSidebar />
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-24 lg:ml-64 lg:max-w-[calc(100%-16rem)] lg:px-8">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <OwnerDashboardSkeleton />
          </section>
        </main>
      </div>
    );
  }

  const totalProperties = properties.length;
  const publishedCount = properties.filter((p) => p.status === "published").length;
  const draftCount = properties.filter((p) => p.status === "draft").length;
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const isProfileComplete = Boolean(profile);
  const verificationStatus = profile?.verification_status || user?.owner_verification_status || "draft";
  const isPendingReview = verificationStatus === "pending_review";
  const isRejected = verificationStatus === "rejected";
  const canPublish = Boolean(user?.is_verified) && verificationStatus === "approved";
  const chartData = [18, 24, 14, 30, 22, 28, 19];
  const maxChart = Math.max(...chartData, 1);

  return (
    <div ref={dashboardRootRef} className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-24 lg:ml-64 lg:max-w-[calc(100%-16rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white p-6 shadow-soft"
        >
          {isLoading ? (
            <OwnerDashboardSkeleton />
          ) : (
            <>
              <div data-owner-reveal="true" className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Mon espace</h1>
                  <p className="mt-1 text-xs text-neutral-600">
                    Bienvenue {user?.full_name || user?.email}.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 font-medium ${
                        isProfileComplete
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isProfileComplete ? "Profil complet" : "Profil incomplet"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
                      Statut: {user?.role || "propriétaire"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPublish ? (
                    <Link
                      href="/proprietaire/biens/nouveau"
                      className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Ajouter un bien
                    </Link>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600">
                      Publication bloquée jusqu’à validation
                    </span>
                  )}
                  <Link
                    href="/proprietaire/profil"
                    className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    {isProfileComplete ? "Modifier le profil" : "Compléter le profil"}
                  </Link>
                  <Link
                    href="/messages"
                    className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Messages
                  </Link>
                </div>
              </div>

              {(isPendingReview || isRejected) && (
                <div
                  data-owner-reveal="true"
                  className={`mt-5 rounded-2xl border px-4 py-4 text-sm ${
                    isRejected
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <p className="font-semibold">
                    {isRejected ? "Dossier KYC refusé" : "Profil en cours de validation"}
                  </p>
                  <p className="mt-1">
                    {isRejected
                      ? profile?.verification_notes || "Le super admin a demandé une nouvelle soumission."
                      : "Le super admin doit encore valider votre selfie, votre pièce d’identité et votre justificatif de propriété."}
                  </p>
                  {isRejected && (
                    <Link href="/proprietaire/nouveau" className="mt-3 inline-flex font-semibold text-red-700 underline">
                      Corriger et renvoyer le dossier
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  data-owner-reveal="true"
                  data-owner-lift="true"
                  className="rounded-2xl border border-neutral-200 p-4"
                  style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
                >
                  <p className="text-xs text-neutral-500">Biens publiés</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">{publishedCount}</p>
                </div>
                <div
                  data-owner-reveal="true"
                  data-owner-lift="true"
                  className="rounded-2xl border border-neutral-200 p-4"
                  style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
                >
                  <p className="text-xs text-neutral-500">Brouillons</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">{draftCount}</p>
                </div>
                <div
                  data-owner-reveal="true"
                  data-owner-lift="true"
                  className="rounded-2xl border border-neutral-200 p-4"
                  style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
                >
                  <p className="text-xs text-neutral-500">Total de biens</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">{totalProperties}</p>
                </div>
                <div
                  data-owner-reveal="true"
                  data-owner-lift="true"
                  className="rounded-2xl border border-neutral-200 p-4"
                  style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
                >
                  <p className="text-xs text-neutral-500">Vues</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">{totalViews}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
                 <div
                   data-owner-reveal="true"
                   data-owner-lift="true"
                   className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                   style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
                 >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Activité récente</p>
                      <p className="text-xs text-neutral-500">Vues sur 7 jours</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
                      {totalViews} vues
                    </span>
                  </div>
                  <div className="mt-6 flex h-36 items-end gap-2">
                    {chartData.map((value, index) => (
                      <div key={index} className="flex flex-1 flex-col items-center gap-2">
                         <div
                           data-owner-bar="true"
                           className="w-full rounded-full bg-blue-500/20"
                           style={{ height: `${Math.max(16, (value / maxChart) * 120)}px` }}
                         />
                        <span className="text-[10px] text-neutral-400">J{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
                 <div
                   data-owner-reveal="true"
                   data-owner-lift="true"
                   className="rounded-2xl border border-neutral-200 bg-white p-5"
                   style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
                 >
                  <p className="text-sm font-semibold text-neutral-900">Répartition</p>
                  <p className="text-xs text-neutral-500">État des annonces</p>
                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>Publiés</span>
                        <span>{publishedCount}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-neutral-100">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{
                            width: `${totalProperties ? (publishedCount / totalProperties) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>Brouillons</span>
                        <span>{draftCount}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-neutral-100">
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{
                            width: `${totalProperties ? (draftCount / totalProperties) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

               <div
                 data-owner-reveal="true"
                 data-owner-lift="true"
                 className="mt-8 rounded-2xl border border-neutral-200 p-5"
                 style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
               >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Mes biens</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Accédez à la liste complète de vos annonces.
                    </p>
                  </div>
                  <Link
                    href="/proprietaire/biens"
                    className="rounded-full border border-blue-100 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Voir tous mes biens
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-600">
                  <span className="rounded-full bg-neutral-100 px-3 py-1">{totalProperties} annonce(s)</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    {publishedCount} publiées
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                    {draftCount} brouillon(s)
                  </span>
                </div>
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              </div>

               <div
                 data-owner-reveal="true"
                 data-owner-lift="true"
                 className="mt-8 rounded-2xl border border-neutral-200 p-5"
                 style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}
               >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Contrat de bail</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      On reprend le process. Le module reste visible ici pendant qu’on le redéfinit.
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                    bientôt disponible
                  </span>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
                  Le contrat de bail et la signature en ligne sont retirés du parcours public
                  pour le moment. Cette zone reste dans l’espace propriétaire pour préparer la
                  prochaine version du process.
                </div>
              </div>
            </>
          )}
        </motion.section>
      </main>
    </div>
  );
}

