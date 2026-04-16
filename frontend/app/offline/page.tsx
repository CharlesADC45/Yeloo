"use client";

function SadYelooIcon() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] bg-[#2f57ff] shadow-[0_24px_80px_rgba(47,87,255,0.26)]"
    >
      <span className="absolute inset-x-5 top-8 h-7 rounded-full bg-white/10" />
      <span className="flex items-center gap-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_8px_22px_rgba(15,23,42,0.18)]">
          <span className="h-3 w-3 rounded-full bg-[#111827]" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_8px_22px_rgba(15,23,42,0.18)]">
          <span className="h-3 w-3 rounded-full bg-[#111827]" />
        </span>
      </span>
      <span className="absolute bottom-7 h-5 w-12 rounded-t-full border-t-[4px] border-white/90" />
      <span className="absolute right-6 top-5 h-4 w-2 rotate-[-18deg] rounded-full bg-white/70" />
    </div>
  );
}

export default function OfflineFallbackPage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8 text-neutral-950">
      <section className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center">
        <div className="rounded-[2rem] bg-white px-7 py-9 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
          <SadYelooIcon />
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2f57ff]">
            Hors connexion
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
            Connexion requise
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-base leading-7 text-neutral-500">
            Vos permissions ont expiré. Connectez-vous à Internet pour continuer.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#2f57ff] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(47,87,255,0.24)] transition active:scale-[0.98]"
          >
            Réessayer
          </button>
        </div>
      </section>
    </main>
  );
}
