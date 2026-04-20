"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
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
    <div className="py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Icon />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">{helper}</p>
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
    <Link href={href} className="group block rounded-[1.5rem] bg-neutral-50 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-700">
          <Icon />
        </span>
        <FiArrowRight className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-950" />
      </div>
      <p className="mt-5 text-sm font-semibold text-neutral-950">{label}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{helper}</p>
      <p className="mt-4 text-xl font-semibold tracking-tight text-neutral-950">{value}</p>
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

    const load = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
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
        if (!silent) {
          setError(err instanceof Error ? err.message : "Impossible de charger le dashboard super admin.");
        }
      } finally {
        if (active && !silent) setIsLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token, user?.role]);

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
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-8"
      >
        <section className="max-w-5xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            <FiShield />
            Super admin
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
                Cockpit YELOO
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">
                Pilote les modules produit, la validation KYC propriétaire, les publications et les flux sensibles sans quitter le tableau de bord.
              </p>
            </div>
            <div className="text-sm text-neutral-500">
              <p className="font-semibold text-neutral-950">{user?.full_name || user?.email}</p>
              <p className="mt-1 text-xs">Supervision temps réel</p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : dashboard && counts ? (
          <>
            <section className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
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
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.18fr_0.82fr]">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Pilotage rapide</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Les modules les plus sensibles pour l'expérience propriétaire et locataire.
                    </p>
                  </div>
                  <Link
                    href="/admin/modules"
                    className="mt-0.5 inline-flex shrink-0 items-center gap-2 rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Tout voir
                    <FiArrowRight />
                  </Link>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {criticalModules.map((module) => (
                    <button
                      key={module.key}
                      type="button"
                      onClick={() => void handleToggleModule(module)}
                      disabled={pendingModule === module.key}
                      className={`rounded-[1.5rem] px-5 py-4 text-left transition ${
                        module.is_enabled ? "bg-blue-50" : "bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-950">{module.name}</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">{module.description}</p>
                        </div>
                        <span className="text-2xl text-blue-600">
                          {module.is_enabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] text-neutral-400">Mis à jour le {formatDate(module.updated_at)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Queue KYC</h2>
                    <p className="mt-1 text-sm text-neutral-500">Les propriétaires qui attendent une décision admin.</p>
                  </div>
                  <span className="mt-0.5 shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {kycQueue.length} dossier(s)
                  </span>
                </div>

                <div className="space-y-3">
                  {kycQueue.slice(0, 4).map((profile) => (
                    <Link key={profile.id} href="/admin/verifications" className="block rounded-[1.5rem] bg-neutral-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-950">{profile.full_name || profile.email}</p>
                          <p className="mt-1 text-sm text-neutral-500">{profile.email}</p>
                          <p className="mt-1 text-xs text-neutral-500">{profile.city}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          pending_review
                        </span>
                      </div>
                    </Link>
                  ))}

                  {!kycQueue.length && (
                    <div className="rounded-[1.5rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                      Aucun dossier KYC en attente pour le moment.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Activité récente</h2>
                    <p className="mt-1 text-sm text-neutral-500">Ce qui vient de bouger sur la plateforme.</p>
                  </div>
                  <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                    {recentActivity.length} entrée(s)
                  </span>
                </div>
                <div className="mt-5 divide-y divide-neutral-100">
                  {recentActivity.map((item: AdminActivityItem) => (
                    <article key={item.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-950">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-neutral-500">{item.description}</p>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                          {item.status || item.type}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-neutral-400">{formatDate(item.created_at)}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">Propriétaires récents</h2>
                  <div className="mt-4 divide-y divide-neutral-100">
                    {dashboard.recent_owners.map((owner) => (
                      <article key={owner.id} className="py-4">
                        <p className="font-semibold text-neutral-950">{owner.full_name || owner.email}</p>
                        <p className="mt-1 text-sm text-neutral-500">{owner.email}</p>
                        <p className="mt-2 text-xs text-neutral-400">{formatDate(owner.created_at)}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="border-t border-neutral-200/70 pt-5 md:border-t-0 md:pt-0">
                  <h2 className="text-lg font-semibold text-neutral-950">Publications récentes</h2>
                  <div className="mt-4 divide-y divide-neutral-100">
                    {dashboard.recent_properties.slice(0, 5).map((property) => (
                      <article key={property.id} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-950">{property.title}</p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {[property.city, property.neighborhood].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            {property.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-neutral-950">
                          {property.price.toLocaleString("fr-FR")} FCFA / {property.price_period}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {property.deposit_months ? `Caution : ${property.deposit_months} mois` : "Caution non renseignée"}
                          {property.advance_months ? ` · Avance : ${property.advance_months} mois` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-400">
                          {property.owner_name || "Propriétaire inconnu"} · {formatDate(property.created_at)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <QuickActionCard
                href="/messages"
                label="Chat annonces"
                helper="Vérifie rapidement l'expérience de messagerie locataire / propriétaire."
                value="Conversations"
                Icon={FiMessageCircle}
              />
              <QuickActionCard
                href="/admin/verifications"
                label="KYC approuvés"
                helper="Propriétaires déjà validés par revue admin."
                value={`${counts.approved_owner_kyc}`}
                Icon={FiCheckCircle}
              />
              <QuickActionCard
                href="/admin/verifications"
                label="KYC refusés"
                helper="Dossiers à reprendre par les propriétaires concernés."
                value={`${counts.rejected_owner_kyc}`}
                Icon={FiXCircle}
              />
            </section>
          </>
        ) : null}

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </motion.section>
    </main>
  );
}
