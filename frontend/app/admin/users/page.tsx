"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminOwnerKycSummary,
  type AdminUserSummary,
  deleteAdminUser,
  fetchAdminOwnerKyc,
  fetchAdminUsers,
  updateAdminUserSuspension,
} from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

const roleFilters = [
  { key: "all", label: "Tous" },
  { key: "locataire", label: "Locataires" },
  { key: "proprietaire", label: "Propriétaires" },
  { key: "admin", label: "Admins" },
];

function formatDate(value?: string | null) {
  if (!value) return "Non renseigné";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value?: string | null) {
  if (!value) return "Non renseigné";
  const labels: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
  };
  return labels[value] || value;
}

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [role, setRole] = useState("all");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<AdminOwnerKycSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const [userData, kycData] = await Promise.all([
          fetchAdminUsers(token, role === "all" ? undefined : role),
          fetchAdminOwnerKyc(token).catch(() => []),
        ]);
        if (!active) return;
        setUsers(userData);
        setOwnerProfiles(kycData);
      } catch (err) {
        if (!active) return;
        if (!silent) {
          setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
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
  }, [role, token]);

  const stats = useMemo(
    () => ({
      total: users.length,
      verified: users.filter((item) => item.is_verified).length,
      suspended: users.filter((item) => item.is_suspended).length,
    }),
    [users]
  );

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const selectedOwnerProfile = useMemo(
    () => ownerProfiles.find((item) => item.user_id === selectedUser?.id) || null,
    [ownerProfiles, selectedUser?.id]
  );

  useEffect(() => {
    if (selectedUserId && !selectedUser) {
      setSelectedUserId(null);
    }
  }, [selectedUser, selectedUserId]);

  const toggleSuspension = async (user: AdminUserSummary) => {
    if (!token) return;
    setPendingUserId(user.id);
    try {
      const updated = await updateAdminUserSuspension(token, user.id, !user.is_suspended);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setPendingUserId(null);
    }
  };

  const deleteUser = async (user: AdminUserSummary) => {
    if (!token || deletingUserId) return;

    const label = user.full_name || user.email;
    const confirmed = window.confirm(
      `Supprimer définitivement ${label} ? Ses annonces, conversations et demandes liées seront supprimées aussi.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    setError(null);
    try {
      await deleteAdminUser(token, user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setSelectedUserId((current) => (current === user.id ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const renderActions = (user: AdminUserSummary) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void toggleSuspension(user);
        }}
        disabled={pendingUserId === user.id || deletingUserId === user.id}
        className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
          user.is_suspended ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {user.is_suspended ? (
          <span className="inline-flex items-center gap-2">
            <FiUserCheck />
            Réactiver
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <FiUserX />
            Suspendre
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void deleteUser(user);
        }}
        disabled={
          deletingUserId === user.id ||
          pendingUserId === user.id ||
          currentUser?.id === user.id
        }
        className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="inline-flex items-center gap-2">
          <FiTrash2 />
          {deletingUserId === user.id ? "Suppression..." : "Supprimer"}
        </span>
      </button>
    </div>
  );

  const renderBadgeRow = (user: AdminUserSummary) => (
    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
        {user.role}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 ${
          user.is_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {user.is_verified ? "Vérifié" : "À vérifier"}
      </span>
      {user.role === "proprietaire" && user.owner_verification_status && (
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
          KYC : {statusLabel(user.owner_verification_status)}
        </span>
      )}
      {user.is_suspended && (
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Suspendu</span>
      )}
    </div>
  );

  const selectedInfoFields: Array<{ label: string; value: string; Icon: IconType }> = selectedUser
    ? [
        { label: "Nom complet", value: selectedUser.full_name || "Non renseigné", Icon: FiUsers },
        { label: "Email", value: selectedUser.email, Icon: FiMail },
        { label: "Téléphone", value: selectedUser.phone || "Non renseigné", Icon: FiPhone },
        { label: "Rôle", value: selectedUser.role, Icon: FiShield },
        { label: "Créé le", value: formatDate(selectedUser.created_at), Icon: FiCalendar },
        {
          label: "Statut du compte",
          value: selectedUser.is_suspended ? "Suspendu" : "Actif",
          Icon: FiUserCheck,
        },
      ]
    : [];

  return (
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-7"
      >
        {selectedUser ? (
          <section className="max-w-6xl space-y-7">
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500"
            >
              <FiArrowLeft />
              Retour aux utilisateurs
            </button>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section className="space-y-7">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                    <FiUsers />
                    Profil utilisateur
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
                    {selectedUser.full_name || "Utilisateur sans nom"}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-500">{selectedUser.email}</p>
                  {renderBadgeRow(selectedUser)}
                </div>

                <section>
                  <h2 className="text-lg font-semibold text-neutral-950">Informations fournies</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {selectedInfoFields.map(({ label, value, Icon }) => (
                      <div key={label} className="rounded-[1.4rem] bg-neutral-50 px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                          <Icon className="text-sm" />
                          {label}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-neutral-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {selectedUser.role === "proprietaire" && (
                  <section>
                    <h2 className="text-lg font-semibold text-neutral-950">Vérification propriétaire</h2>
                    {selectedOwnerProfile ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                              <FiMapPin />
                              Ville principale
                            </div>
                            <p className="mt-2 text-sm font-semibold text-neutral-950">
                              {selectedOwnerProfile.city || "Non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                              <FiShield />
                              Statut KYC
                            </div>
                            <p className="mt-2 text-sm font-semibold text-neutral-950">
                              {statusLabel(selectedOwnerProfile.verification_status)}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            ["Pièce d'identité", selectedOwnerProfile.identity_doc_name],
                            ["Selfie de vérification", selectedOwnerProfile.identity_selfie_name],
                            ["Justificatif de propriété", selectedOwnerProfile.property_proof_name],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-[1.4rem] bg-white px-4 py-4 ring-1 ring-neutral-100">
                              <FiFileText className="text-blue-600" />
                              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                                {label}
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-neutral-950">
                                {value || "Non fourni"}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                          <p>
                            Notes de vérification :{" "}
                            <span className="font-semibold text-neutral-950">
                              {selectedOwnerProfile.verification_notes || "Aucune note"}
                            </span>
                          </p>
                          <p className="mt-2 text-xs text-neutral-400">
                            Dernière mise à jour : {formatDate(selectedOwnerProfile.updated_at)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.4rem] bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                        Aucun dossier de vérification propriétaire trouvé pour cet utilisateur.
                      </div>
                    )}
                  </section>
                )}
              </section>

              <aside className="h-fit rounded-[1.6rem] bg-neutral-950 p-5 text-white">
                <p className="text-sm font-semibold">Actions du compte</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Suspendez temporairement le compte ou supprimez-le définitivement si nécessaire.
                </p>
                <div className="mt-5">{renderActions(selectedUser)}</div>
                {currentUser?.id === selectedUser.id && (
                  <p className="mt-4 text-xs leading-5 text-white/55">
                    Vous ne pouvez pas supprimer le compte admin actuellement connecté.
                  </p>
                )}
              </aside>
            </div>
          </section>
        ) : (
          <>
            <section className="max-w-4xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                <FiUsers />
                Utilisateurs
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
                Gestion des comptes
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
                Surveille les locataires, propriétaires et admins, puis ouvre une fiche pour vérifier les détails.
              </p>
            </section>

            <section className="grid max-w-4xl grid-cols-3 text-center">
              {[
                ["Comptes affichés", stats.total],
                ["Vérifiés", stats.verified],
                ["Suspendus", stats.suspended],
              ].map(([label, value]) => (
                <div key={label} className="py-3">
                  <p className="text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {label}
                  </p>
                </div>
              ))}
            </section>

            <div className="flex flex-wrap gap-2">
              {roleFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setRole(filter.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    role === filter.key
                      ? "bg-neutral-950 text-white"
                      : "bg-white text-neutral-600 hover:text-neutral-950"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <AdminDashboardSkeleton />
            ) : (
              <section className="max-w-5xl bg-white">
                <div className="divide-y divide-neutral-100">
                  {users.map((user) => (
                    <article
                      key={user.id}
                      className="flex w-full flex-wrap items-start justify-between gap-4 py-5 text-left"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block font-semibold text-neutral-950">
                          {user.full_name || user.email}
                        </span>
                        <span className="mt-1 block text-sm text-neutral-500">{user.email}</span>
                        {renderBadgeRow(user)}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderActions(user)}
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700"
                        >
                          Voir détails
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {error && (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </motion.section>
    </main>
  );
}
