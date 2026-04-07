"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiShield, FiUserCheck, FiUserX, FiUsers } from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminUserSummary,
  fetchAdminUsers,
  updateAdminUserSuspension,
} from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

const roleFilters = [
  { key: "all", label: "Tous" },
  { key: "locataire", label: "Locataires" },
  { key: "proprietaire", label: "PropriÃ©taires" },
  { key: "admin", label: "Admins" },
];

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const [role, setRole] = useState("all");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

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
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [role, token]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      verified: users.filter((item) => item.is_verified).length,
      suspended: users.filter((item) => item.is_suspended).length,
    };
  }, [users]);

  const toggleSuspension = async (user: AdminUserSummary) => {
    if (!token) return;
    setPendingUserId(user.id);
    try {
      const updated = await updateAdminUserSuspension(token, user.id, !user.is_suspended);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise Ã  jour impossible.");
    } finally {
      setPendingUserId(null);
    }
  };

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
                <FiUsers />
                Utilisateurs
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900">
                Gestion des comptes
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Surveille les locataires, propriÃ©taires et admins, puis suspends si besoin.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Comptes affichÃ©s</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{stats.total}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">VÃ©rifiÃ©s</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{stats.verified}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Suspendus</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{stats.suspended}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {roleFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setRole(filter.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                role === filter.key
                  ? "bg-blue-600 text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : (
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-[1.4rem] border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{user.full_name || user.email}</p>
                    <p className="mt-1 text-sm text-neutral-600">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-white px-2.5 py-1 text-neutral-600">{user.role}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          user.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {user.is_verified ? "VÃ©rifiÃ©" : "Ã€ vÃ©rifier"}
                      </span>
                      {user.role === "proprietaire" && user.owner_verification_status && (
                        <span
                          className={`rounded-full px-2.5 py-1 ${
                            user.owner_verification_status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : user.owner_verification_status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          KYC : {user.owner_verification_status}
                        </span>
                      )}
                      {user.is_suspended && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Suspendu</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleSuspension(user)}
                      disabled={pendingUserId === user.id}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        user.is_suspended
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {user.is_suspended ? (
                        <span className="inline-flex items-center gap-2">
                          <FiUserCheck />
                          RÃ©activer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <FiUserX />
                          Suspendre
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div className="mt-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>
        )}
      </motion.section>
    </main>
  );
}

