"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { OwnerListSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

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

const STATUS_LABELS: Record<string, string> = {
  published: "Publié",
  draft: "Brouillon",
  suspendu: "Suspendu",
};

export default function ProprietaireBiensPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isOwnerRole) {
      router.replace("/");
      return;
    }
  }, [isAuthenticated, isOwnerRole, router, user]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/properties/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const detail =
            payload?.detail || payload?.message || `Erreur API (${response.status})`;
          throw new Error(detail);
        }
        const data = (await response.json()) as OwnerProperty[];
        if (isMounted) {
          setProperties(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Impossible de charger vos biens.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProperties();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleDelete = async (propertyId: string) => {
    if (!token) {
      setError("Connectez-vous pour supprimer une annonce.");
      return;
    }
    const confirmed = window.confirm("Supprimer définitivement cette annonce ?");
    if (!confirmed) return;

    setDeletingId(propertyId);
    setError(null);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/properties/${propertyId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload?.detail || payload?.message || `Erreur API (${response.status})`;
        throw new Error(detail);
      }
      setProperties((prev) => prev.filter((item) => item.id !== propertyId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Suppression impossible.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusToggle = async (propertyId: string, nextStatus: string) => {
    if (!token) {
      setError("Connectez-vous pour modifier une annonce.");
      return;
    }
    setUpdatingId(propertyId);
    setError(null);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/properties/${propertyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload?.detail || payload?.message || `Erreur API (${response.status})`;
        throw new Error(detail);
      }
      const updated = (await response.json()) as OwnerProperty;
      setProperties((prev) =>
        prev.map((item) => (item.id === propertyId ? updated : item)),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Mise à jour impossible.";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <h1 className="text-lg font-semibold">Accès propriétaire</h1>
            <p className="mt-2 text-xs text-neutral-600">
              Connectez-vous pour consulter vos biens.
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

  if (isAuthenticated && user && !isOwnerRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-24 lg:ml-64 lg:max-w-[calc(100%-16rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white p-6 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Mes biens</h1>
              <p className="mt-1 text-xs text-neutral-600">
                Retrouvez toutes vos annonces.
              </p>
            </div>
            {isVerifiedOwner ? (
              <Link
                href="/proprietaire/biens/nouveau"
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Ajouter un bien
              </Link>
            ) : (
              <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600">
                Validation admin en cours
              </span>
            )}
          </div>

          {isLoading && (
            <OwnerListSkeleton />
          )}
          {!isLoading && error && <p className="mt-6 text-sm text-red-600">{error}</p>}
          {!isLoading && !error && properties.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
              Aucun bien pour le moment. Ajoutez votre première annonce.
            </div>
          )}
          {!isLoading && !error && properties.length > 0 && (
            <div className="mt-6 grid gap-3">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {property.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {property.neighborhood || "Quartier"} - {property.city}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
                      {STATUS_LABELS[property.status] || property.status}
                    </span>
                    <span className="text-neutral-600">
                      {Number(property.price).toLocaleString("fr-FR")} FCFA /{" "}
                      {property.price_period}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusToggle(
                            property.id,
                            property.status === "published" ? "draft" : "published",
                          )
                        }
                        disabled={updatingId === property.id}
                        className="rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === property.id
                          ? "Mise à jour..."
                          : property.status === "published"
                            ? "Mettre en brouillon"
                            : "Publier"}
                      </button>
                      <Link
                        href={`/proprietaire/biens/${property.id}`}
                        className="rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Modifier
                      </Link>
                      <Link
                        href={`/logements/${property.id}`}
                        className="rounded-full border border-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Voir la fiche
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(property.id)}
                        disabled={deletingId === property.id}
                        className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === property.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}

