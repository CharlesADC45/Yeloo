"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiLayers, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import { type FeatureModule, fetchAdminDashboard, updateFeatureModule } from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

export default function AdminModulesPage() {
  const token = useAuthStore((s) => s.token);
  const [modules, setModules] = useState<FeatureModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingModule, setPendingModule] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await fetchAdminDashboard(token);
        if (!active) return;
        setModules(data.modules);
      } catch (err) {
        if (!active) return;
        if (!silent) {
          setError(err instanceof Error ? err.message : "Impossible de charger les modules.");
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
  }, [token]);

  const groupedModules = useMemo(() => {
    const groups = new Map<string, FeatureModule[]>();
    for (const module of modules) {
      const bucket = groups.get(module.category) || [];
      bucket.push(module);
      groups.set(module.category, bucket);
    }
    return Array.from(groups.entries());
  }, [modules]);

  const handleToggle = async (module: FeatureModule) => {
    if (!token) return;
    setPendingModule(module.key);
    setModules((current) =>
      current.map((item) => (item.key === module.key ? { ...item, is_enabled: !item.is_enabled } : item))
    );
    try {
      const updated = await updateFeatureModule(token, module.key, !module.is_enabled);
      setModules((current) => current.map((item) => (item.key === updated.key ? updated : item)));
    } catch (err) {
      setModules((current) =>
        current.map((item) => (item.key === module.key ? { ...item, is_enabled: module.is_enabled } : item))
      );
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le module.");
    } finally {
      setPendingModule(null);
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
            <FiLayers />
            Modules
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
            Activation des fonctionnalités
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Active ou coupe les blocs principaux de la plateforme pour piloter Yeloo comme un produit modulaire.
          </p>
        </section>

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : (
          <section className="space-y-8">
            {groupedModules.map(([category, items]) => (
              <div key={category} className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {category}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((module) => (
                    <button
                      key={module.key}
                      type="button"
                      onClick={() => void handleToggle(module)}
                      disabled={pendingModule === module.key}
                      className={`rounded-[1.5rem] px-5 py-4 text-left transition ${
                        module.is_enabled ? "bg-blue-50 text-neutral-950" : "bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{module.name}</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">{module.description}</p>
                        </div>
                        <span className="text-2xl text-blue-600">
                          {module.is_enabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
          </section>
        )}
      </motion.section>
    </main>
  );
}
