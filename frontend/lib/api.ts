export const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (baseUrl) {
    return baseUrl.replace(/\/+$/, "");
  }
  return "http://localhost:8000";
};
