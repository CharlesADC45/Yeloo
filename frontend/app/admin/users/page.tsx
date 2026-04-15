"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiTrash2, FiUserCheck, FiUserX, FiUsers } from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminUserSummary,
  deleteAdminUser,
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

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [role, setRole] = useState("all");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminUsers(token, role === "all" ? undefined : role);
        if (!active) return;
        setUsers(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-7"
      >
        <section className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            <FiUsers />
            Utilisateurs
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
            Gestion des comptes
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Surveille les locataires, propriétaires et admins, puis suspends les comptes si besoin.
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
                  className="flex flex-wrap items-start justify-between gap-4 py-5"
                >
                  <div>
                    <p className="font-semibold text-neutral-950">{user.full_name || user.email}</p>
                    <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                        {user.role}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          user.is_verified
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {user.is_verified ? "Vérifié" : "À vérifier"}
                      </span>
                      {user.role === "proprietaire" && user.owner_verification_status && (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                          KYC : {user.owner_verification_status}
                        </span>
                      )}
                      {user.is_suspended && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                          Suspendu
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleSuspension(user)}
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
                      onClick={() => void deleteUser(user)}
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
      </motion.section>
    </main>
  );
}
