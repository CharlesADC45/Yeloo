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
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminDashboard(token);
        if (!active) return;
        setModules(data.modules);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les modules.");
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
    <main className="mx-auto w-full px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FiLayers />
            Modules
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900">
            Activation des fonctionnalités
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Active ou coupe les blocs principaux de la plateforme pour piloter Yeloo comme un produit modulaire.
          </p>
        </div>

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : (
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="space-y-5">
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
                      </button>
                    ))}
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
