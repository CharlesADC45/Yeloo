export const IVORY_COAST_COUNTRY_CODE = "+225";


function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}


export function extractIvoryCoastLocalPhone(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return "";

  if (digits.startsWith("225")) {
    return digits.slice(3, 13);
  }

  return digits.slice(0, 10);
}


export function normalizeIvoryCoastPhoneForApi(value: string): string {
  const localPhone = extractIvoryCoastLocalPhone(value);
  return localPhone ? `${IVORY_COAST_COUNTRY_CODE}${localPhone}` : "";
}


export function formatIvoryCoastLocalPhone(value: string): string {
  const localPhone = extractIvoryCoastLocalPhone(value);
  const groups = localPhone.match(/.{1,2}/g);
  return groups ? groups.join(" ") : "";
}
