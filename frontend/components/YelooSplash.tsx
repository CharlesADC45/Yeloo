"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function SplashLogo() {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.9rem] bg-[#2F57FF] shadow-[0_30px_80px_rgba(47,87,255,0.35)]">
      <span className="absolute inset-x-4 top-7 h-6 rounded-full bg-white/10" />
      <span className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(255,255,255,0.26)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0F172A]" />
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(255,255,255,0.26)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0F172A]" />
        </span>
      </span>
      <span className="absolute bottom-6 h-4 w-10 rounded-b-full border-b-[4px] border-white/90" />
    </div>
  );
}

export function YelooSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "yeloo-splash-seen";

    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "true");
    setShow(true);

    const timer = window.setTimeout(() => setShow(false), 1850);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-white"
        >
          <motion.div
            initial={{ scale: 0.84, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.06, opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="flex flex-col items-center"
          >
            <SplashLogo />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
              className="mt-5 text-3xl font-extrabold tracking-[-0.05em] text-neutral-950"
            >
              Yeloo
            </motion.p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.45, duration: 0.9, ease: "easeInOut" }}
              className="mt-5 h-1 w-32 origin-left rounded-full bg-[#2F57FF]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
