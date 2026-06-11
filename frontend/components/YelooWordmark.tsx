import Link from "next/link";

type YelooWordmarkProps = {
  href?: string;
  className?: string;
  markClassName?: string;
  replace?: boolean;
};

export function YelooWordmark({
  href,
  className = "",
  markClassName = "",
  replace = false,
}: YelooWordmarkProps) {
  const mark = (
    <span
      className={`yeloo-wordmark inline-flex items-end text-[2rem] font-black leading-none tracking-[-0.09em] text-neutral-950 ${markClassName}`}
    >
      <span>yeloo</span>
      <span className="yeloo-wordmark-plus ml-0.5 text-[2.18rem] leading-none text-[#1854e2]">+</span>
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
