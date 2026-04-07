"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  imageUrl: string;
  className?: string;
};

declare global {
  interface Window {
    pannellum?: {
      viewer: (container: HTMLElement | string, config: Record<string, unknown>) => unknown;
    };
  }
}

const PANNELLUM_JS = "/vendor/pannellum/pannellum.js";
const PANNELLUM_CSS = "/vendor/pannellum/pannellum.css";

export function PannellumViewer({ imageUrl, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;
    setUseFallback(false);

    const ensureCss = () => {
      if (document.querySelector(`link[data-pannellum="true"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = PANNELLUM_CSS;
      link.dataset.pannellum = "true";
      document.head.appendChild(link);
    };

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.pannellum) {
          resolve();
          return;
        }
        const existing = document.querySelector(`script[data-pannellum="true"]`);
        if (existing) {
          if (window.pannellum) {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () =>
            reject(new Error("Pannellum indisponible"))
          );
          return;
        }
        const script = document.createElement("script");
        script.src = PANNELLUM_JS;
        script.async = true;
        script.dataset.pannellum = "true";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Pannellum indisponible"));
        document.body.appendChild(script);
      });

    ensureCss();
    void ensureScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.pannellum) {
          if (isMounted) {
            setUseFallback(true);
          }
          return;
        }
        containerRef.current.innerHTML = "";
        window.pannellum.viewer(containerRef.current, {
          type: "equirectangular",
          panorama: imageUrl,
          autoLoad: true,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          compass: false,
        });
      })
      .catch(() => {
        if (isMounted) {
          setUseFallback(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  if (useFallback) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-slate-100 ${
          className ?? ""
        }`}
      >
        <img src={imageUrl} alt="Visite 360" className="h-full w-full object-cover" />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-neutral-700 shadow-sm">
          Apercu 360
        </span>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
