'use client';
import { useEffect, useState } from 'react';

export function OrbitalCore({ score, trend }: { score: number; trend: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const steps = 40;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      const p = Math.min(1, i / steps);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(score * eased);
      if (p >= 1) clearInterval(iv);
    }, 1700 / 40);
    return () => clearInterval(iv);
  }, [score]);

  const whole = Math.floor(v);
  const dec = Math.floor((v - whole) * 10);

  return (
    <div className="core">
      <div className="core-glow" />
      <div className="core-disc" />
      <div className="core-content">
        <div className="core-label">Democracy Score</div>
        <div className="core-score">
          {whole}
          <span className="dec">.{dec}</span>
        </div>
        <div className="core-trend">
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}
          <span style={{ color: 'hsl(var(--text-faint))' }}>· 30d</span>
        </div>
        <div className="core-sub">NETWORK HEALTH INDEX</div>
      </div>
    </div>
  );
}
