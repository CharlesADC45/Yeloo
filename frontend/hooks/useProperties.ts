"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import { ApiProperty, mapApiProperty, Property } from "@/lib/properties";

const parseProperties = (payload: ApiProperty[]) => payload.map(mapApiProperty);

export const useProperties = () => {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`${apiBaseUrl}/api/properties`, { signal });
      if (!response.ok) {
        throw new Error(`Erreur API (${response.status})`);
      }
      const data = (await response.json()) as ApiProperty[];
      return Array.isArray(data) ? parseProperties(data) : [];
    },
    [apiBaseUrl]
  );

  const refetch = useCallback(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchProperties(controller.signal)
      .then((data) => {
        setProperties(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        const message =
          err.message === "Failed to fetch"
            ? "Impossible de contacter l'API (verifie que le backend tourne)."
            : err.message || "Erreur de chargement.";
        setError(message);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [fetchProperties]);

  useEffect(() => {
    const abort = refetch();
    return () => abort?.();
  }, [refetch]);

  return {
    properties,
    isLoading,
    error,
    apiBaseUrl,
    refetch,
  };
};

export const useProperty = (propertyId?: string) => {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(propertyId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setProperty(null);
      setIsLoading(false);
      setError("Identifiant manquant.");
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${apiBaseUrl}/api/properties/${propertyId}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Logement introuvable."
              : `Erreur API (${response.status})`
          );
        }
        return response.json() as Promise<ApiProperty>;
      })
      .then((data) => {
        setProperty(mapApiProperty(data));
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        const message =
          err.message === "Failed to fetch"
            ? "Impossible de contacter l'API (verifie que le backend tourne)."
            : err.message || "Erreur de chargement.";
        setError(message);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [apiBaseUrl, propertyId]);

  return { property, isLoading, error, apiBaseUrl };
};
