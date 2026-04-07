"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiHome,
  FiLayers,
  FiMessageCircle,
  FiShield,
  FiToggleLeft,
  FiToggleRight,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminActivityItem,
  type AdminDashboard,
  type AdminOwnerKycSummary,
  type FeatureModule,
  fetchAdminDashboard,
  fetchAdminOwnerKyc,
  updateFeatureModule,
} from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  helper,
  Icon,
}: {
  label: string;
  value: number;
  helper: string;
  Icon: typeof FiUsers;
}) {
  return (
    <div className="rounded-[1.8rem] border border-neutral-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">{value}</p>
          <p className="mt-2 text-xs text-neutral-500">{helper}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  label,
  helper,
  value,
  Icon,
}: {
  href: string;
  label: string;
  helper: string;
  value: string;
  Icon: typeof FiShield;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft transition hover:border-blue-200 hover:bg-blue-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon />
        </div>
        <span className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500">
          <FiArrowRight />
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-neutral-900">{label}</p>
      <p className="mt-1 text-xs text-neutral-500">{helper}</p>
      <p className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">{value}</p>
    </Link>
  );
}

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [kycQueue, setKycQueue] = useState<AdminOwnerKycSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingModule, setPendingModule] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [dashboardData, kycData] = await Promise.all([
          fetchAdminDashboard(token),
          fetchAdminOwnerKyc(token, "pending_review"),
        ]);
        if (!active) return;
        setDashboard(dashboardData);
        setKycQueue(kycData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger le dashboard super admin.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [token, user?.role]);

  const groupedModules = useMemo(() => {
    const groups = new Map<string, FeatureModule[]>();
    for (const module of dashboard?.modules || []) {
      const bucket = groups.get(module.category) || [];
      bucket.push(module);
      groups.set(module.category, bucket);
    }
    return Array.from(groups.entries());
  }, [dashboard?.modules]);

  const criticalModules = useMemo(() => {
    if (!dashboard) return [];
    const keys = ["owner_dashboard", "owner_kyc", "listing_chat", "notifications"];
    return dashboard.modules.filter((module) => keys.includes(module.key));
  }, [dashboard]);

  const handleToggleModule = async (module: FeatureModule) => {
    if (!token || !dashboard) return;
    setPendingModule(module.key);
    setDashboard({
      ...dashboard,
      modules: dashboard.modules.map((item) =>
        item.key === module.key ? { ...item, is_enabled: !item.is_enabled } : item
      ),
      counts: {
        ...dashboard.counts,
        active_modules: module.is_enabled
          ? Math.max(0, dashboard.counts.active_modules - 1)
          : dashboard.counts.active_modules + 1,
      },
    });
    try {
      const updated = await updateFeatureModule(token, module.key, !module.is_enabled);
      setDashboard((current) =>
        current
          ? {
              ...current,
              modules: current.modules.map((item) => (item.key === updated.key ? updated : item)),
            }
          : current
      );
    } catch (err) {
      setDashboard((current) =>
        current
          ? {
              ...current,
              modules: current.modules.map((item) =>
                item.key === module.key ? { ...item, is_enabled: module.is_enabled } : item
              ),
              counts: {
                ...current.counts,
                active_modules: module.is_enabled
                  ? current.counts.active_modules + 1
                  : Math.max(0, current.counts.active_modules - 1),
              },
            }
          : current
      );
      setError(err instanceof Error ? err.message : "Mise à jour du module impossible.");
    } finally {
      setPendingModule(null);
    }
  };

  const counts = dashboard?.counts;
  const recentActivity = dashboard?.recent_activities || [];

  return (
    <main className="mx-auto w-full px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <FiShield />
                Super admin
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900">Cockpit YELOO</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Pilote les modules produit, la validation KYC propriétaire, les publications et les flux sensibles sans quitter le tableau de bord.
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              <p className="font-semibold text-neutral-900">{user?.full_name || user?.email}</p>
              <p className="mt-1 text-xs">Supervision temps réel de la plateforme</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : dashboard && counts ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Utilisateurs"
                value={counts.total_users}
                helper={`${counts.total_tenants} locataires · ${counts.total_owners} propriétaires`}
                Icon={FiUsers}
              />
              <StatCard
                label="KYC en attente"
                value={counts.pending_owner_kyc}
                helper={`${counts.approved_owner_kyc} validés · ${counts.rejected_owner_kyc} refusés`}
                Icon={FiClock}
              />
              <StatCard
                label="Propriétaires vérifiés"
                value={counts.verified_owners}
                helper={`${counts.total_admins} admin(s) · ${counts.suspended_users} suspendu(s)`}
                Icon={FiCheckCircle}
              />
              <StatCard
                label="Publications"
                value={counts.total_properties}
                helper={`${counts.published_properties} publiées · ${counts.draft_properties} brouillons`}
                Icon={FiHome}
              />
              <StatCard
                label="Modules actifs"
                value={counts.active_modules}
                helper={`${counts.total_lease_requests} demandes de bail au total`}
                Icon={FiLayers}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickActionCard
                href="/admin/verifications"
                label="Revue KYC"
                helper="Dossiers propriétaires à contrôler"
                value={`${counts.pending_owner_kyc} en attente`}
                Icon={FiShield}
              />
              <QuickActionCard
                href="/admin/modules"
                label="Modules"
                helper="Activer ou couper les briques produit"
                value={`${counts.active_modules} actifs`}
                Icon={FiLayers}
              />
              <QuickActionCard
                href="/admin/publications"
                label="Publications"
                helper="Modération des annonces et caution"
                value={`${counts.published_properties} publiées`}
                Icon={FiFileText}
              />
              <QuickActionCard
                href="/admin/users"
                label="Utilisateurs"
                helper="Locataires, propriétaires et statuts"
                value={`${counts.suspended_users} suspendu(s)`}
                Icon={FiUsers}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Pilotage rapide</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Les modules les plus sensibles pour l’expérience propriétaire et locataire.
                    </p>
                  </div>
                  <Link
                    href="/admin/modules"
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                  >
                    Tout voir
                    <FiArrowRight />
                  </Link>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {criticalModules.map((module) => (
                    <button
                      key={module.key}
                      type="button"
                      onClick={() => void handleToggleModule(module)}
                      disabled={pendingModule === module.key}
                      className={`rounded-[1.4rem] border p-4 text-left transition ${
                        module.is_enabled ? "border-blue-200 bg-blue-50/60" : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-900">{module.name}</p>
                          <p className="mt-2 text-sm text-neutral-600">{module.description}</p>
                        </div>
                        <span className="text-2xl text-blue-600">
                          {module.is_enabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] text-neutral-400">Mis à jour le {formatDate(module.updated_at)}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Queue KYC</h2>
                    <p className="mt-1 text-sm text-neutral-500">Les propriétaires qui attendent une décision admin.</p>
                  </div>
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {kycQueue.length} dossier(s)
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {kycQueue.slice(0, 4).map((profile) => (
                    <Link
                      key={profile.id}
                      href="/admin/verifications"
                      className="block rounded-[1.4rem] border border-neutral-200 bg-neutral-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-900">{profile.full_name || profile.email}</p>
                          <p className="mt-1 text-sm text-neutral-600">{profile.email}</p>
                          <p className="mt-1 text-xs text-neutral-500">{profile.city}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          pending_review
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-500">
                        <span className="rounded-full bg-white px-2.5 py-1">ID: {profile.identity_doc_name || "manquant"}</span>
                        <span className="rounded-full bg-white px-2.5 py-1">Selfie: {profile.identity_selfie_name || "manquant"}</span>
                      </div>
                    </Link>
                  ))}

                  {!kycQueue.length && (
                    <div className="rounded-[1.4rem] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                      Aucun dossier KYC en attente pour le moment.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Activité récente</h2>
                    <p className="mt-1 text-sm text-neutral-500">Ce qui vient de bouger sur la plateforme.</p>
                  </div>
                  <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                    {recentActivity.length} entrée(s)
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {recentActivity.map((item: AdminActivityItem) => (
                    <div key={item.id} className="rounded-[1.4rem] border border-neutral-200 bg-neutral-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-900">{item.title}</p>
                          <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                          {item.status || item.type}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] text-neutral-400">{formatDate(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-neutral-900">Propriétaires récents</h2>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                      {dashboard.recent_owners.length}
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {dashboard.recent_owners.map((owner) => (
                      <div key={owner.id} className="rounded-[1.3rem] border border-neutral-200 p-4">
                        <p className="font-semibold text-neutral-900">{owner.full_name || owner.email}</p>
                        <p className="mt-1 text-sm text-neutral-600">{owner.email}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              owner.owner_verification_status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : owner.owner_verification_status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {owner.owner_verification_status || (owner.is_verified ? "approved" : "pending_review")}
                          </span>
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                            {formatDate(owner.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-neutral-900">Publications récentes</h2>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                      {dashboard.recent_properties.length}
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {dashboard.recent_properties.slice(0, 5).map((property) => (
                      <div key={property.id} className="rounded-[1.3rem] border border-neutral-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-900">{property.title}</p>
                            <p className="mt-1 text-sm text-neutral-600">
                              {[property.city, property.neighborhood].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            {property.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-neutral-900">
                          {property.price.toLocaleString("fr-FR")} FCFA / {property.price_period}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {property.deposit_months ? `Caution : ${property.deposit_months} mois` : "Caution non renseignée"}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-400">
                          {property.owner_name || "Propriétaire inconnu"} · {formatDate(property.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/messages"
                className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FiMessageCircle />
                </div>
                <p className="mt-5 text-sm font-semibold text-neutral-900">Chat annonces</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Vérifie rapidement l’expérience de messagerie locataire / propriétaire.
                </p>
              </Link>

              <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <FiCheckCircle />
                </div>
                <p className="mt-5 text-sm font-semibold text-neutral-900">KYC approuvés</p>
                <p className="mt-1 text-xs text-neutral-500">Propriétaires déjà validés par revue admin.</p>
                <p className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">{counts.approved_owner_kyc}</p>
              </div>

              <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                  <FiXCircle />
                </div>
                <p className="mt-5 text-sm font-semibold text-neutral-900">KYC refusés</p>
                <p className="mt-1 text-xs text-neutral-500">Dossiers à reprendre par les propriétaires concernés.</p>
                <p className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">{counts.rejected_owner_kyc}</p>
              </div>
            </div>
          </>
        ) : null}

        {error && (
          <div className="rounded-[1.6rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </motion.section>
    </main>
  );
}
