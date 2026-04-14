"use client";

import { motion } from "framer-motion";
import { FiThumbsUp, FiX } from "react-icons/fi";

type CelebrationModalProps = {
  open: boolean;
  title: string;
  message: string;
  actionLabel?: string;
  onClose?: () => void;
};

export function CelebrationModal({
  open,
  title,
  message,
  actionLabel = "Continuer",
  onClose,
}: CelebrationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-neutral-950/35 p-4 backdrop-blur-sm sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.95 }}
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-100" />
        <div className="pointer-events-none absolute -bottom-20 left-4 h-40 w-40 rounded-full bg-emerald-100" />

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
            aria-label="Fermer"
          >
            <FiX />
          </button>
        )}

        <motion.div
          initial={{ rotate: -12, scale: 0.6 }}
          animate={{ rotate: [0, -8, 7, 0], scale: 1 }}
          transition={{ delay: 0.16, duration: 0.9, ease: "easeOut" }}
          className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-blue-600 text-4xl text-white shadow-[0_18px_40px_rgba(37,99,235,0.34)]"
        >
          <FiThumbsUp />
        </motion.div>

        <div className="relative mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
            Félicitations
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-500">{message}</p>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex w-full justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
