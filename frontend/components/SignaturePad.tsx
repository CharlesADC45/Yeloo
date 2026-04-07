"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type SignaturePadProps = {
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
};

export function SignaturePad({ onChange, disabled = false, className = "" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const syncCanvasSize = useCallback(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const ratio = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const height = 200;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.5;
    context.strokeStyle = "#1f2937";
  }, []);

  useEffect(() => {
    syncCanvasSize();
    const handleResize = () => syncCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncCanvasSize]);

  const emitValue = useCallback(() => {
    if (!canvasRef.current || !onChange) return;
    onChange(hasSignature ? canvasRef.current.toDataURL("image/png") : null);
  }, [hasSignature, onChange]);

  useEffect(() => {
    emitValue();
  }, [emitValue]);

  const getPoint = useCallback((event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const context = canvasRef.current?.getContext("2d");
      const point = getPoint(event);
      if (!context || !point) return;
      isDrawingRef.current = true;
      context.beginPath();
      context.moveTo(point.x, point.y);
      setHasSignature(true);
    },
    [disabled, getPoint]
  );

  const draw = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || disabled) return;
      const context = canvasRef.current?.getContext("2d");
      const point = getPoint(event);
      if (!context || !point) return;
      context.lineTo(point.x, point.y);
      context.stroke();
    },
    [disabled, getPoint]
  );

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange?.(null);
  }, [onChange]);

  const statusText = useMemo(
    () => (hasSignature ? "Signature capturée" : "Signez dans la zone ci-dessous"),
    [hasSignature]
  );

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        ref={wrapperRef}
        className="rounded-[1.6rem] border border-neutral-200 bg-white p-3 shadow-soft"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className={`w-full touch-none rounded-[1.1rem] bg-neutral-50 ${disabled ? "opacity-60" : "cursor-crosshair"}`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">{statusText}</p>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasSignature}
          className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}
