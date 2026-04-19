"use client";

import "leaflet/dist/leaflet.css";
import type {
  DivIcon,
  LatLngBounds,
  Map as LeafletMap,
  Marker as LeafletMarker,
  TileLayer,
} from "leaflet";
import { useEffect, useRef, useState } from "react";
import { FiLayers } from "react-icons/fi";
import type { Property } from "@/lib/properties";

type Props = {
  properties: Property[];
  selectedId?: string | null;
  onSelect?: (property: Property) => void;
  locateSignal?: number;
  fitBoundsSignal?: number;
  onFitBounds?: () => void;
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [5.34, -3.99]; // Abidjan
const CLUSTER_GRID_SIZE = 60;
const CLUSTER_BREAK_ZOOM = 15;

function buildUserLocationIcon() {
  return `
    <div class="imc-user-location">
      <span class="imc-user-location__halo"></span>
      <span class="imc-user-location__pin">
        <span class="imc-user-location__dot"></span>
      </span>
      <span class="imc-user-location__stem"></span>
    </div>
  `;
}

function buildMarkerPreview(property: Property) {
  const title = property.title.replace(/"/g, "&quot;");
  const price = property.price.toLocaleString("fr-FR");
  const rooms = typeof property.rooms === "number" ? property.rooms : "—";
  const bathrooms = typeof property.bathrooms === "number" ? property.bathrooms : "—";
  const surface = typeof property.surfaceM2 === "number" ? property.surfaceM2 : "—";
  const location = (property.neighborhood || property.city || "Abidjan").replace(
    /"/g,
    "&quot;"
  );
  const verifiedBadge = property.ownerIsVerified
    ? `<span class="imc-hover-card__badge">Vérifié</span>`
    : "";

  return `
    <div class="imc-hover-card">
      <div class="imc-hover-card__header">
        <p class="imc-hover-card__title">${title}</p>
      </div>
      <div class="imc-hover-card__body">
        <img src="${property.imageUrl}" alt="${title}" class="imc-hover-card__image" />
        <div class="imc-hover-card__content">
          <p class="imc-hover-card__price">${price}F</p>
          <p class="imc-hover-card__location">${location}</p>
          <div class="imc-hover-card__meta">
            <span><strong>${rooms}</strong><small>Beds</small></span>
            <span><strong>${bathrooms}</strong><small>Baths</small></span>
            <span><strong>${surface}</strong><small>Sqm.</small></span>
          </div>
          ${verifiedBadge}
        </div>
      </div>
    </div>
  `;
}

export function MapboxMap({
  properties,
  selectedId,
  onSelect,
  locateSignal,
  fitBoundsSignal,
  onFitBounds,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const markerByPropertyIdRef = useRef<Map<string, LeafletMarker>>(new Map());
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const streetLayerRef = useRef<TileLayer | null>(null);
  const satelliteLayerRef = useRef<TileLayer | null>(null);
  const boundsRef = useRef<LatLngBounds | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const renderMarkersRef = useRef<(() => void) | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  const openMarkerPopup = (marker: LeafletMarker) => {
    const map = mapRef.current;
    if (!map || !marker.getPopup()) return;
    if (!(marker as LeafletMarker & { _map?: LeafletMap | null })._map) return;

    const safeOpen = () => {
      try {
        marker.openPopup();
      } catch {
        // Ignore transient Leaflet popup timing issues during map updates.
      }
    };

    requestAnimationFrame(safeOpen);
    window.setTimeout(safeOpen, 80);
  };

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      const leaflet = await import("leaflet");
      if (!isMounted) return;
      leafletRef.current = leaflet;

      const map = leaflet.map(containerRef.current).setView(DEFAULT_CENTER, 12);
      mapRef.current = map;

      streetLayerRef.current = leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        })
        .addTo(map);
      satelliteLayerRef.current = leaflet.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19,
        }
      );

      const handleViewportChange = () => {
        renderMarkersRef.current?.();
      };

      const handleResize = () => {
        map.invalidateSize();
      };

      const resizeObserver =
        typeof ResizeObserver !== "undefined" && containerRef.current
          ? new ResizeObserver(() => {
              map.invalidateSize();
            })
          : null;

      map.on("zoomend", handleViewportChange);
      window.addEventListener("resize", handleResize);
      resizeObserver?.observe(containerRef.current);
      const refreshMapSize = () => {
        map.invalidateSize();
        renderMarkersRef.current?.();
      };

      requestAnimationFrame(refreshMapSize);
      window.setTimeout(refreshMapSize, 80);
      window.setTimeout(refreshMapSize, 220);

      return () => {
        map.off("zoomend", handleViewportChange);
        window.removeEventListener("resize", handleResize);
        resizeObserver?.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    void initMap().then((teardown) => {
      cleanup = teardown;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locateSignal]);

  useEffect(() => {
    const map = mapRef.current;
    const streetLayer = streetLayerRef.current;
    const satelliteLayer = satelliteLayerRef.current;
    if (!map || !streetLayer || !satelliteLayer) return;

    if (isSatellite) {
      if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
      if (!map.hasLayer(satelliteLayer)) satelliteLayer.addTo(map);
      return;
    }

    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    if (!map.hasLayer(streetLayer)) streetLayer.addTo(map);
  }, [isSatellite]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !userLocation) return;

    const [lat, lng] = userLocation;
    map.setView([lat, lng], 12);

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    userMarkerRef.current = leaflet
      .marker([lat, lng], {
        icon: leaflet.divIcon({
          className: "imc-marker",
          html: buildUserLocationIcon(),
          iconSize: [44, 56],
          iconAnchor: [22, 46],
        }),
        interactive: false,
      })
      .addTo(map);
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;

    renderMarkersRef.current = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markerByPropertyIdRef.current = new Map();

      const valid = properties.filter(
        (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
      );

      if (valid.length === 0) {
        boundsRef.current = null;
        return;
      }

      const bounds = leaflet.latLngBounds([]);

      const zoom = map.getZoom();
      const shouldCluster = zoom < CLUSTER_BREAK_ZOOM;

      if (!shouldCluster) {
        valid.forEach((p) => {
          const lat = p.latitude as number;
          const lng = p.longitude as number;
          const isSelected = selectedId && p.id === selectedId;

          const marker = leaflet.marker([lat, lng], {
            icon: leaflet.divIcon({
              className: "imc-marker",
              html: `<div class="imc-price-marker ${
                isSelected ? "is-selected" : ""
              }">
              <span class="imc-price-value">${p.price.toLocaleString("fr-FR")}</span>
              <span class="imc-price-suffix">F</span>
            </div>`,
            }),
          }).addTo(map);

          marker.on("click", () => {
            openMarkerPopup(marker);
            onSelect?.(p);
          });

          marker.bindPopup(buildMarkerPreview(p), {
            offset: leaflet.point(0, -16),
            className: "imc-hover-tooltip imc-map-popup",
            closeButton: false,
            autoPan: true,
          });

          markersRef.current.push(marker);
          markerByPropertyIdRef.current.set(p.id, marker);
          bounds.extend([lat, lng]);
        });
      } else {
        type ClusterBucket = {
          key: string;
          properties: Property[];
          lat: number;
          lng: number;
        };

        const buckets = new Map<string, ClusterBucket>();

        valid.forEach((property) => {
          const lat = property.latitude as number;
          const lng = property.longitude as number;
          const point = map.project([lat, lng], zoom);
          const x = Math.floor(point.x / CLUSTER_GRID_SIZE);
          const y = Math.floor(point.y / CLUSTER_GRID_SIZE);
          const key = `${x}:${y}`;
          const bucket = buckets.get(key);

          if (bucket) {
            bucket.properties.push(property);
            bucket.lat =
              (bucket.lat * (bucket.properties.length - 1) + lat) / bucket.properties.length;
            bucket.lng =
              (bucket.lng * (bucket.properties.length - 1) + lng) / bucket.properties.length;
            return;
          }

          buckets.set(key, {
            key,
            properties: [property],
            lat,
            lng,
          });
        });

        buckets.forEach((bucket) => {
          const [first] = bucket.properties;
          const isSingle = bucket.properties.length === 1;
          const isSelected =
            isSingle && selectedId ? first.id === selectedId : false;

          let icon: DivIcon;

          if (isSingle) {
            icon = leaflet.divIcon({
              className: "imc-marker",
              html: `<div class="imc-price-marker ${
                isSelected ? "is-selected" : ""
              }">
              <span class="imc-price-value">${first.price.toLocaleString("fr-FR")}</span>
              <span class="imc-price-suffix">F</span>
            </div>`,
            });
          } else {
            const clusterTone =
              bucket.properties.length >= 6 ? "is-strong" : "is-soft";
            icon = leaflet.divIcon({
              className: "imc-marker",
              html: `<div class="imc-cluster-marker ${clusterTone}">
              <span class="imc-cluster-count">${bucket.properties.length}</span>
            </div>`,
            });
          }

          const marker = leaflet
            .marker([bucket.lat, bucket.lng], { icon })
            .addTo(map);

          if (isSingle) {
            marker.on("click", () => {
              openMarkerPopup(marker);
              onSelect?.(first);
            });

            marker.bindPopup(buildMarkerPreview(first), {
              offset: leaflet.point(0, -16),
              className: "imc-hover-tooltip imc-map-popup",
              closeButton: false,
              autoPan: true,
            });

            markerByPropertyIdRef.current.set(first.id, marker);
          } else {
            const clusterBounds = leaflet.latLngBounds(
              bucket.properties.map((property) => [
                property.latitude as number,
                property.longitude as number,
              ])
            );

            marker.on("click", () => {
              map.fitBounds(clusterBounds.pad(0.35), {
                maxZoom: Math.min(zoom + 2, 16),
              });
            });
          }

          markersRef.current.push(marker);
          bucket.properties.forEach((property) => {
            bounds.extend([property.latitude as number, property.longitude as number]);
          });
        });
      }

      boundsRef.current = bounds.isValid() ? bounds : null;
    };

    renderMarkersRef.current();

    return () => {
      renderMarkersRef.current = null;
    };
  }, [properties, selectedId, onSelect, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedId) {
      markerByPropertyIdRef.current.forEach((marker) => marker.closePopup());
      return;
    }

    const marker = markerByPropertyIdRef.current.get(selectedId);
    if (!marker) return;

    const openSelectedPopup = () => {
      if (mapRef.current !== map) return;
      if (markerByPropertyIdRef.current.get(selectedId) !== marker) return;
      if (!marker.getPopup()) return;
      if (!(marker as LeafletMarker & { _map?: LeafletMap | null })._map) return;

      openMarkerPopup(marker);
    };

    map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    map.once("moveend", openSelectedPopup);

    const fallbackTimer = window.setTimeout(openSelectedPopup, 120);

    return () => {
      window.clearTimeout(fallbackTimer);
      map.off("moveend", openSelectedPopup);
    };
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const bounds = boundsRef.current;
    if (!map || userLocation || !bounds || !bounds.isValid()) return;
    map.fitBounds(bounds.pad(0.2));
  }, [properties, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const bounds = boundsRef.current;
    if (!map || !leaflet || !bounds || !bounds.isValid()) return;
    map.fitBounds(bounds.pad(0.2));
    onFitBounds?.();
  }, [fitBoundsSignal, onFitBounds]);

  return (
    <div
      style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}
      className={`relative z-0 block w-full min-w-0 max-w-full overflow-hidden bg-neutral-100 ${
        className ?? "h-[62vh] min-h-[420px]"
      }`}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <button
        type="button"
        onClick={() => setIsSatellite((value) => !value)}
        className="absolute right-4 top-4 z-[500] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_14px_34px_rgba(15,23,42,0.18)] transition hover:scale-105"
        aria-label={isSatellite ? "Afficher le plan" : "Afficher en mode satellite"}
        title={isSatellite ? "Plan" : "Satellite"}
      >
        <FiLayers className="text-lg" />
      </button>
    </div>
  );
}

