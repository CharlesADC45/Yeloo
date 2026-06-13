import Link from "next/link";

type YelooWordmarkProps = {
  href?: string;
  className?: string;
  markClassName?: string;
  casing?: "title" | "upper";
  replace?: boolean;
};

export function YelooWordmark({
  href,
  className = "",
  markClassName = "",
  casing = "title",
  replace = false,
}: YelooWordmarkProps) {
  const label = casing === "upper" ? "YELOO" : "Yeloo";
  const mark = (
    <span
      className={`yeloo-wordmark inline-flex items-end text-[2rem] font-extrabold leading-none tracking-[-0.075em] text-neutral-950 ${markClassName}`}
    >
      <span>{label}</span>
      <span className="yeloo-wordmark-plus ml-0.5 text-[2.12rem] font-extrabold leading-none text-[#2563eb]">+</span>
    </span>
  );

  if (!href) {
    return <span className={className}>{mark}</span>;
  }

  return (
    <Link href={href} replace={replace} className={`inline-flex items-center ${className}`} aria-label="Yeloo+ accueil">
      {mark}
    </Link>
  );
}
