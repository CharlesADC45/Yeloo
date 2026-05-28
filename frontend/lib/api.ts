const LOCAL_API_BASE_URL = "http://localhost:8000";
const PROD_API_BASE_URL = "https://yeloo-api.onrender.com";

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const isPrivateNetworkHostname = (hostname: string) =>
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

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
    if (isPrivateNetworkHostname(hostname)) {
      return `http://${hostname}:8000`;
    }
    return PROD_API_BASE_URL;
  }

  return PROD_API_BASE_URL;
};
