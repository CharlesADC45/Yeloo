import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-blue-50 px-4">
      <section className="w-full max-w-xl rounded-[2.2rem] border border-neutral-200 bg-white p-8 text-center shadow-soft sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          Cette page n&apos;existe pas.
        </h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600 sm:text-base">
          Pas de souci, on vous ramène à Yeloo. La page demandée est introuvable ou a
          peut-être été déplacée.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-blue-700"
        >
          Retour à l&apos;accueil
        </Link>
      </section>
    </main>
  );
}
