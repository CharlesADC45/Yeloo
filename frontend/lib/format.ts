// Shared price formatting so every screen shows "185 000 FCFA / mois" (editorial line §4).

const priceFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 185000 -> "185 000" (non-breaking space so the amount never wraps). */
export function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return priceFormatter.format(amount).replace(/[  \s]/g, " ");
}

/** 185000, "mois" -> "185 000 FCFA / mois"; without a period -> "185 000 FCFA". */
export function formatPriceLabel(value: number | string | null | undefined, period?: string | null) {
  const label = `${formatPrice(value)} FCFA`;
  return period ? `${label} / ${period}` : label;
}
