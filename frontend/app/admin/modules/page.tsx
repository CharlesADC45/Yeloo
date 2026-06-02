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
  const [pendingConfig, setPendingConfig] = useState<Record<string, string>>({});

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
      const updated = await updateFeatureModule(token, module.key, !module.is_enabled, module.config_value ?? null);
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

  const handleConfigSave = async (module: FeatureModule) => {
    if (!token) return;
    const rawValue = pendingConfig[module.key] ?? String(module.config_value ?? 3);
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError("La limite d'essais doit être supérieure ou égale à 1.");
      return;
    }
    setPendingModule(module.key);
    setError(null);
    try {
      const updated = await updateFeatureModule(token, module.key, module.is_enabled, parsed);
      setModules((current) => current.map((item) => (item.key === updated.key ? updated : item)));
      setPendingConfig((current) => ({ ...current, [module.key]: String(parsed) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder la limite.");
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
                    <div
                      key={module.key}
                      className={`rounded-[1.5rem] border px-5 py-4 text-left text-neutral-800 transition ${
                        module.is_enabled
                          ? "border-blue-200 bg-neutral-50"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{module.name}</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">{module.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggle(module)}
                          disabled={pendingModule === module.key}
                          className={`text-2xl disabled:opacity-60 ${
                            module.is_enabled ? "text-blue-600" : "text-neutral-500"
                          }`}
                          aria-label={module.is_enabled ? "Désactiver le module" : "Activer le module"}
                        >
                          {module.is_enabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                      </div>
                      {module.key === "login_guard" && (
                        <div className="mt-4 rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-blue-100">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                            Limite d'essais
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={pendingConfig[module.key] ?? String(module.config_value ?? 3)}
                              onChange={(event) =>
                                setPendingConfig((current) => ({
                                  ...current,
                                  [module.key]: event.target.value,
                                }))
                              }
                              className="w-24 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleConfigSave(module)}
                              disabled={pendingModule === module.key}
                              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              Sauvegarder
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-neutral-500">
                            Exemple : 3 essais ratés, puis le compte est bloqué jusqu'au déblocage admin.
                          </p>
                        </div>
                      )}
                    </div>
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
