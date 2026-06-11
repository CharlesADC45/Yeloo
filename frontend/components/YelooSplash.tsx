"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { YelooWordmark } from "@/components/YelooWordmark";

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
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#1854e2]"
        >
          <motion.div
            initial={{ scale: 0.84, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.06, opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="flex flex-col items-center"
          >
            <YelooWordmark
              markClassName="!text-[3.8rem] !tracking-[-0.1em] !text-white sm:!text-[4.8rem]"
            />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.45, duration: 0.9, ease: "easeInOut" }}
              className="mt-7 h-1 w-28 origin-left rounded-full bg-white/70"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
