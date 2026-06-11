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
    id: "view-front",
    title: "Vue 1",
    description: "Angle principal de la photo 360.",
    position: { yaw: -0.35, pitch: 0.02 },
  },
  {
    id: "view-left",
    title: "Vue 2",
    description: "Angle lateral pour explorer la meme photo.",
    position: { yaw: 1.1, pitch: -0.04 },
  },
  {
    id: "view-right",
    title: "Vue 3",
    description: "Autre point de vue dans la meme photo 360.",
    position: { yaw: 2.3, pitch: 0.03 },
  },
  {
    id: "view-back",
    title: "Vue 4",
    description: "Retour vers l'angle oppose de la photo.",
    position: { yaw: -2.35, pitch: -0.06 },
  },
];

function isSameOriginAsset(url: string) {
  if (url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:")) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

function getPanoramaRenderUrl(url: string) {
  if (isSameOriginAsset(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return url;
    return `/api/tour-proxy?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
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
  const panoramaUrl = useMemo(() => getPanoramaRenderUrl(imageUrl), [imageUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;
    let viewer: ViewerInstance | null = null;
    let removePanoramaErrorListener: (() => void) | null = null;
    setUseFallback(false);
    containerRef.current.replaceChildren();

    const init = async () => {
      try {
        const canLoad = await canLoadPanorama(panoramaUrl);
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
          panorama: panoramaUrl,
          navbar: false,
          mousewheel: true,
          touchmoveTwoFingers: false,
          defaultZoomLvl: 72,
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
  }, [panoramaUrl, tourPoints]);

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
    <div className={`yeloo-tour-shell relative h-full w-full overflow-hidden rounded-[1.75rem] bg-neutral-100 ${className ?? ""}`}>
      <div ref={containerRef} className="h-full min-h-[21rem] w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <div className="pointer-events-auto rounded-[1.35rem] border border-white/70 bg-white/82 p-2 text-neutral-950 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[1.5rem] sm:p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">Angles de vue</p>
              <p className="mt-1 text-sm font-semibold">{activePoint?.title || "Vue principale"}</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">{activePoint?.description || "Explorez differents angles dans la meme photo 360."}</p>
            </div>
            <div className="hide-scrollbar flex gap-2 overflow-x-auto sm:grid sm:grid-cols-2 xl:grid-cols-4">
              {tourPoints.map((point, index) => {
                const isActive = point.id === activePointId;
                return (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => void focusPoint(point.id)}
                    className={`min-w-[5.25rem] rounded-2xl px-3 py-2 text-left transition sm:min-w-0 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-soft"
                        : "bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive ? "bg-white text-blue-700" : "bg-neutral-100 text-neutral-700"
                    }`}>
                      {index + 1}
                    </span>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-4">{point.title}</p>
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
