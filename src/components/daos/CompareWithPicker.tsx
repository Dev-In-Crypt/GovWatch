'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CompareWithPicker({
  currentSlug,
  options,
}: {
  currentSlug: string;
  options: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const [other, setOther] = useState('');

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs mono"
      style={{
        background: 'hsl(var(--indigo) / 0.08)',
        boxShadow: 'inset 0 0 0 1px hsl(var(--indigo) / 0.24)',
      }}
    >
      <span className="uppercase tracking-wider text-[hsl(var(--indigo-bright))]">Compare with</span>
      <select
        value={other}
        onChange={(e) => setOther(e.target.value)}
        className="h-8 rounded bg-[hsl(var(--text-dim)/0.05)] px-2 text-xs shadow-[inset_0_0_0_1px_hsl(var(--line))]"
      >
        <option value="">Pick another DAO…</option>
        {options
          .filter((d) => d.slug !== currentSlug)
          .map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
      </select>
      <button
        type="button"
        disabled={!other}
        onClick={() => other && router.push(`/compare?a=${currentSlug}&b=${other}`)}
        className="h-8 rounded px-3 text-xs font-medium disabled:opacity-40"
        style={{
          background: 'hsl(var(--indigo) / 0.2)',
          color: 'hsl(var(--indigo-bright))',
        }}
      >
        Compare →
      </button>
    </div>
  );
}
