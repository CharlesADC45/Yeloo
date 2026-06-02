"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TourPoint = {
  id: string;
  title: string;
  description: string;
  position: {
    yaw: number;
    pitch: number;
  };
};

type Props = {
  imageUrl: string;
  fallbackImageUrl?: string;
  className?: string;
  title?: string;
  location?: string;
  priceLabel?: string;
  points?: TourPoint[];
};

type ViewerInstance = {
  destroy: () => void;
  addEventListener: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener: (type: string, listener: (event: unknown) => void) => void;
  getPlugin: (plugin: unknown) => {
    gotoMarker: (markerId: string, speed?: string | number) => Promise<void>;
  } | null;
};

const DEFAULT_POINTS: TourPoint[] = [
  {
    id: "living-zone",
    title: "Piece de vie",
    description: "Vue principale pour evaluer la circulation et la lumiere.",
    position: { yaw: -0.35, pitch: 0.02 },
  },
  {
    id: "sleeping-zone",
    title: "Zone nuit",
    description: "Reperez la transition vers les chambres et les rangements.",
    position: { yaw: 1.1, pitch: -0.04 },
  },
  {
    id: "kitchen-zone",
    title: "Cuisine / service",
    description: "Point de controle utile pour les finitions et les acces.",
    position: { yaw: 2.3, pitch: 0.03 },
  },
  {
    id: "outside-zone",
    title: "Ouverture exterieure",
    description: "Mesurez la vue, l'ouverture et la respiration du logement.",
    position: { yaw: -2.35, pitch: -0.06 },
  },
];

function isSameOriginAsset(url: string) {
  if (url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:")) {
    return true;
  }

  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function canLoadPanorama(url: string) {
  if (isSameOriginAsset(url)) {
    return true;
  }

  try {
    const response = await fetch(url, {
      cache: "force-cache",
      mode: "cors",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function PhotoSphereViewer({
  imageUrl,
  fallbackImageUrl,
  className,
  title,
  location,
  priceLabel,
  points,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ViewerInstance | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const pointsKey = JSON.stringify(points?.length ? points : DEFAULT_POINTS);
  const tourPoints = useMemo<TourPoint[]>(
    () => (points?.length ? points : DEFAULT_POINTS),
    // The parent often provides points inline; keying by content prevents viewer re-creation on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pointsKey]
  );
  const activePoint = tourPoints.find((point) => point.id === activePointId) ?? tourPoints[0] ?? null;

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;
    let viewer: ViewerInstance | null = null;
    let removePanoramaErrorListener: (() => void) | null = null;
    setUseFallback(false);
    containerRef.current.replaceChildren();

    const init = async () => {
      try {
        const canLoad = await canLoadPanorama(imageUrl);
        if (!isMounted) return;

        if (!canLoad) {
          setUseFallback(true);
          return;
        }

        const [{ Viewer, events }, { MarkersPlugin }] = await Promise.all([
          import("@photo-sphere-viewer/core"),
          import("@photo-sphere-viewer/markers-plugin"),
        ]);

        if (!isMounted || !containerRef.current) return;

        const markers = tourPoints.map((point) => ({
          id: point.id,
          html: '<span class="yeloo-tour-marker"></span>',
          position: point.position,
          anchor: "center center",
          tooltip: {
            content: `<div><p style="font-weight:600;margin:0 0 4px;">${point.title}</p><p style="margin:0;font-size:12px;line-height:1.45;opacity:0.82;">${point.description}</p></div>`,
          },
          data: point,
          zoomLvl: 55,
        }));

        viewer = new Viewer({
          container: containerRef.current,
          panorama: imageUrl,
          navbar: false,
          mousewheel: true,
          touchmoveTwoFingers: false,
          defaultYaw: tourPoints[0]?.position.yaw ?? 0,
          defaultPitch: tourPoints[0]?.position.pitch ?? 0,
          plugins: [
            MarkersPlugin.withConfig({
              markers,
              gotoMarkerSpeed: "7rpm",
              defaultHoverScale: { amount: 1.5, duration: 120, easing: "ease-out" },
            }),
          ],
        }) as unknown as ViewerInstance;

        const markersPlugin = viewer.getPlugin(MarkersPlugin);
        if (markersPlugin) {
          setActivePointId(tourPoints[0]?.id ?? null);
        }

        const handlePanoramaError = () => {
          if (!isMounted) return;
          setUseFallback(true);
          viewer?.destroy();
          viewerRef.current = null;
        };

        viewer.addEventListener(events.PanoramaErrorEvent.type, handlePanoramaError);
        removePanoramaErrorListener = () => {
          viewer?.removeEventListener(events.PanoramaErrorEvent.type, handlePanoramaError);
        };

        viewerRef.current = viewer;
      } catch {
        if (isMounted) setUseFallback(true);
      }
    };

    void init();

    return () => {
      isMounted = false;
      removePanoramaErrorListener?.();
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl, tourPoints]);

  const focusPoint = async (pointId: string) => {
    setActivePointId(pointId);
    try {
      const { MarkersPlugin } = await import("@photo-sphere-viewer/markers-plugin");
      const plugin = viewerRef.current?.getPlugin(MarkersPlugin);
      await plugin?.gotoMarker(pointId, "7rpm");
    } catch {
      // keep UI state even if camera animation fails
    }
  };

  if (useFallback) {
    return (
      <div className={`relative overflow-hidden rounded-[1.75rem] bg-slate-100 ${className ?? ""}`}>
        <img src={fallbackImageUrl || imageUrl} alt={title || "Visite 360"} className="h-full w-full object-cover" />
        <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/92 px-4 py-3 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Visite 360</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">Apercu panoramique</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`yeloo-tour-shell overflow-hidden rounded-[1.75rem] bg-neutral-950 ${className ?? ""}`}>
      <div ref={containerRef} className="h-full min-h-[21rem] w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto max-w-[20rem] rounded-2xl bg-white/92 px-4 py-3 shadow-soft backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">Visite immersive</p>
          <p className="mt-1 text-sm font-semibold text-neutral-950">{title || "Visite 360 du logement"}</p>
          {(location || priceLabel) && (
            <p className="mt-1 text-xs text-neutral-500">{[location, priceLabel].filter(Boolean).join(" - ")}</p>
          )}
        </div>
        <div className="pointer-events-auto rounded-full bg-white/92 px-3 py-2 text-[11px] font-semibold text-neutral-700 shadow-soft backdrop-blur">
          Glissez pour explorer
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
        <div className="pointer-events-auto rounded-[1.5rem] border border-white/15 bg-neutral-950/72 p-3 text-white shadow-[0_20px_50px_rgba(15,23,42,0.34)] backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Points d'interet</p>
              <p className="mt-1 text-sm font-semibold">{activePoint?.title || "Vue principale"}</p>
              <p className="mt-1 text-xs leading-5 text-white/72">{activePoint?.description || "Explorez le logement sous tous les angles."}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {tourPoints.map((point, index) => {
                const isActive = point.id === activePointId;
                return (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => void focusPoint(point.id)}
                    className={`rounded-2xl px-3 py-2 text-left transition ${
                      isActive
                        ? "bg-white text-neutral-950 shadow-soft"
                        : "bg-white/8 text-white hover:bg-white/12"
                    }`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive ? "bg-blue-600 text-white" : "bg-white/12 text-white"
                    }`}>
                      {index + 1}
                    </span>
                    <p className="mt-2 text-xs font-semibold leading-4">{point.title}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
