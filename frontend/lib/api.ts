const LOCAL_API_BASE_URL = "http://localhost:8000";
const PROD_API_BASE_URL = "https://yeloo-api.onrender.com";

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

export const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (baseUrl) {
    return baseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (isLocalHostname(hostname)) {
      return LOCAL_API_BASE_URL;
    }
    return PROD_API_BASE_URL;
  }

  return PROD_API_BASE_URL;
};
