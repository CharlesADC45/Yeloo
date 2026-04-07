import { motion, AnimatePresence } from "framer-motion";

type Filters = {
  city: string;
  neighborhood: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
};

type Props = {
  filters: Filters;
  onChange: (value: Filters) => void;
  isOpen: boolean;
  onClose: () => void;
  onSearch?: () => void;
};

export function HeroSearch({ filters, onChange, isOpen, onClose, onSearch }: Props) {
  const handleChange =
    (field: keyof Filters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...filters, [field]: e.target.value });
    };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-start justify-center bg-black/30 px-3 pt-20 sm:px-4 sm:pt-24 md:items-center md:pt-0"
        >
          <motion.section
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="max-h-[calc(100vh-2rem)] w-full max-w-[min(92vw,42rem)] overflow-y-auto rounded-3xl bg-white p-4 shadow-soft sm:p-6"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold leading-tight sm:text-lg">
                Trouvez un logement fiable en Côte d&apos;Ivoire.
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                Fermer
              </button>
            </div>

            <p className="mb-4 text-xs leading-6 text-neutral-600 sm:text-sm">
              Des annonces vérifiées, un contact direct avec les propriétaires, pensées
              pour Abidjan et les grandes villes ivoiriennes.
            </p>

            <div className="flex-1">
              <div className="grid gap-3 rounded-2xl bg-neutral-50 p-3 sm:gap-4 sm:p-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Ville
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                    placeholder="Abidjan, Bouake..."
                    value={filters.city}
                    onChange={handleChange("city")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Quartier
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                    placeholder="Cocody, Marcory..."
                    value={filters.neighborhood}
                    onChange={handleChange("neighborhood")}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Min (FCFA)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                      value={filters.minPrice}
                      onChange={handleChange("minPrice")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Max (FCFA)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                      value={filters.maxPrice}
                      onChange={handleChange("maxPrice")}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Type de bien
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                      value={filters.propertyType}
                      onChange={handleChange("propertyType")}
                    >
                      <option value="">Tous</option>
                      <option value="studio">Studio</option>
                      <option value="appartement">Appartement</option>
                      <option value="maison">Maison</option>
                      <option value="villa">Villa</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={onSearch}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-blue-700 md:w-auto"
                  >
                    Rechercher
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-neutral-500 sm:text-xs">
              Bientôt : filtres avancés, cartes interactives et annonces boostées.
            </p>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
