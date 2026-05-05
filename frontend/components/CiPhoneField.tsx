"use client";

import { formatIvoryCoastLocalPhone } from "@/lib/phone";


type CiPhoneFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};


export function CiPhoneField({
  label,
  value,
  onChange,
  placeholder = "Entrez votre numéro mobile",
  required = false,
}: CiPhoneFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/70">
        <div className="flex shrink-0 items-center gap-2 px-3">
          <span className="flex h-4 w-6 overflow-hidden rounded-[3px] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
            <span className="flex-1 bg-[#f77f00]" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-[#009e60]" />
          </span>
          <span className="text-sm font-semibold text-neutral-900">+225</span>
        </div>
        <span className="h-6 w-px bg-neutral-200" />
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required={required}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          placeholder={placeholder}
          value={formatIvoryCoastLocalPhone(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}
