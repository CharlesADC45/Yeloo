"use client";

import Link from "next/link";
import {
  FiArrowLeft,
  FiChevronRight,
  FiHelpCircle,
  FiMail,
  FiMessageCircle,
  FiPhoneCall,
  FiShield,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuthStore } from "@/stores/authStore";

export default function AideSupportPage() {
  const bottomNav = <BottomNav />;

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/compte"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-soft"
            >
              <FiArrowLeft />
            </Link>
            <div className="rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-semibold text-neutral-600 shadow-soft">
              1 / 1
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Aide & Support</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Nous restons disponibles pour vous accompagner.
            </p>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">Contact rapide</h3>
            <div className="mt-4 space-y-3">
              {[
                {
                  label: "Chat avec un conseiller",
                  description: "Disponible 7j/7, réponse rapide",
                  icon: FiMessageCircle,
                },
                {
                  label: "Appelez le support",
                  description: "+225 07 00 00 00 00",
                  icon: FiPhoneCall,
                },
                {
                  label: "Email assistance",
                  description: "support@yeloo.ci",
                  icon: FiMail,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <item.icon />
                    </span>
                    <span>
                      <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
                      <p className="text-xs text-neutral-500">{item.description}</p>
                    </span>
                  </span>
                  <FiChevronRight className="text-neutral-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">Guides utiles</h3>
            <div className="mt-4 space-y-3">
              {[
                {
                  label: "Éviter les arnaques",
                  description: "Bonnes pratiques avant de louer",
                  icon: FiShield,
                },
                {
                  label: "Support pour proprios",
                  description: "Vérifier vos documents",
                  icon: FiHelpCircle,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <item.icon />
                    </span>
                    <span>
                      <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
                      <p className="text-xs text-neutral-500">{item.description}</p>
                    </span>
                  </span>
                  <FiChevronRight className="text-neutral-400" />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </main>
      {bottomNav}
    </div>
  );
}


