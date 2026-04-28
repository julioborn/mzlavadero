"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function DateFilterForm({
  defaultValue,
  extraParams,
}: {
  defaultValue?: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(extraParams ?? {});
    params.set("page", "1");
    if (e.target.value) params.set("date", e.target.value);
    router.push(`/owner/records?${params.toString()}`);
  }

  return (
    <input
      ref={ref}
      type="date"
      defaultValue={defaultValue ?? ""}
      className="input-field text-xs py-2 px-3 w-auto"
      onChange={handleChange}
    />
  );
}
