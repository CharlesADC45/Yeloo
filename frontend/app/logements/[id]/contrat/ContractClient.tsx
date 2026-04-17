"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiFileText, FiMapPin } from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { useProperty } from "@/hooks/useProperties";

type Props = {
  id: string;
};

export function ContractClient({ id }: Props) {
  const { property, isLoading, error } = useProperty(id);
  const location = [property?.neighborhood, property?.city, property?.address]
    .filter(Boolean)
    .join(", ");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 sm:px-8">
          <div className="animate-pulse space-y-4 rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="h-8 w-64 rounded-full bg-neutral-100" />
            <div className="h-4 w-80 rounded-full bg-neutral-100" />
            <div className="h-64 rounded-[1.5rem] bg-neutral-100" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!property || error) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-24">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <p className="text-sm text-neutral-700">{error || "Logement introuvable."}</p>
            <Link href="/" className="mt-4 inline-flex text-sm font-semibold text-blue-600">
              Retour à l&apos;accueil
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 sm:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6 rounded-[2rem] bg-white p-6 shadow-soft"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
              Parcours bail
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
              Contrat de bail en pause pour {property.title}
            </h1>
            <p className="mt-3 text-sm text-neutral-600">
              Le bail numérique est en pause. La signature se fera physiquement entre les deux
              parties pendant que nous gardons cette page comme repère d'information.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Logement
              </p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">{property.title}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-600">
                <FiMapPin className="text-neutral-400" />
                {location || property.city}
              </p>
              <p className="mt-3 text-xl font-semibold text-neutral-900">
                {property.price.toLocaleString("fr-FR")} FCFA
                <span className="text-sm font-normal text-neutral-500"> / {property.pricePeriod}</span>
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Prochaine étape
              </p>
              <p className="mt-2 text-sm leading-7 text-neutral-600">
                Le module reste visible côté propriétaire pour le suivi, mais la signature finale
                se fait désormais hors ligne, sur document physique.
              </p>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex items-center gap-2 text-blue-600">
              <FiFileText />
              <h2 className="text-lg font-semibold text-neutral-900">Pourquoi ce retrait</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-700">
              <p>
                Nous gardons une decision claire: tout bail sera signe physiquement, sur
                document papier.
              </p>
              <p>
                Le propriétaire garde un emplacement dédié dans son espace pendant que nous
                retravaillons le process de bout en bout.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/logements/${id}`}
              className="inline-flex rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Retour à la fiche
            </Link>
            <Link
              href="/favoris"
              className="inline-flex rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Voir mes favoris
            </Link>
          </div>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
