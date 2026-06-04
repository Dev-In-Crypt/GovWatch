'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import type { OrbitalDao } from './Planet';

const PROP_COLOR = {
  pass: 'hsl(var(--mint))',
  live: 'hsl(var(--cyan))',
  fail: 'hsl(var(--rose))',
} as const;

const METRIC_COLOR: Record<string, string> = {
  participation: 'hsl(var(--cyan))',
  powerDistribution: 'hsl(var(--indigo-bright))',
  proposalDiversity: 'hsl(var(--mint))',
  delegateAccountability: 'hsl(var(--amber))',
  manipulationResistance: 'hsl(var(--rose))',
};

const METRIC_LABEL: Record<string, string> = {
  participation: 'Voter Turnout',
  powerDistribution: 'Decentralization',
  proposalDiversity: 'Proposal Diversity',
  delegateAccountability: 'Delegate Activity',
  manipulationResistance: 'Resistance',
};

export function GovPanel({
  dao,
  onClose,
}: {
  dao: OrbitalDao | null;
  onClose: () => void;
}) {
  const open = !!dao;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tagCls =
    dao?.tag === 'good' ? 'tag-good' : dao?.tag === 'watch' ? 'tag-watch' : 'tag-risk';

  return (
    <>
      <div
        className={'gov-scrim' + (open ? ' open' : '')}
        onClick={onClose}
      />
      <aside
        className={'gov-panel' + (open ? ' open' : '')}
        style={
          dao
            ? ({
                ['--p-color' as never]: dao.color,
                ['--p-glow' as never]: dao.glow,
              } as React.CSSProperties)
            : undefined
        }
      >
        {dao && (
          <>
            <div className="gov-head">
              <button className="gov-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
              <div className="gov-id">
                <div className="gp-token">{dao.mono}</div>
                <div>
                  <div className="gp-name">{dao.name}</div>
                  <div className="gp-meta">
                    {dao.holders} holders · {dao.treasury} treasury
                  </div>
                </div>
              </div>
              <div className="gov-score-big">
                <div className="gsb-n">{dao.score.toFixed(1)}</div>
                <div className={'gsb-tag ' + tagCls}>{dao.tagLabel}</div>
              </div>
            </div>
            <div className="gov-body">
              <div>
                <div className="gov-sec-title">Governance Metrics</div>
                <div className="gov-metrics">
                  {Object.entries(dao.breakdown).map(([k, v]) => (
                    <div className="gov-metric" key={k}>
                      <div className="gm-lab">{METRIC_LABEL[k] ?? k}</div>
                      <div className="gm-val">
                        {Number(v).toFixed(0)}
                        <span className="u">/100</span>
                      </div>
                      <div className="gm-bar">
                        <i
                          style={{
                            width: Math.max(0, Math.min(100, Number(v))) + '%',
                            background: METRIC_COLOR[k] ?? 'hsl(var(--indigo-bright))',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="gov-sec-title">Recent Proposals</div>
                {dao.recentProposals.length === 0 && (
                  <div style={{ color: 'hsl(var(--text-dim))', fontSize: 13 }}>
                    No recent proposals.
                  </div>
                )}
                {dao.recentProposals.map((p, i) => (
                  <div className="gov-prop" key={i}>
                    <div
                      className="gpv"
                      style={{ background: PROP_COLOR[p.status] }}
                    />
                    <div>
                      <div className="gp-t">{p.title}</div>
                      <div className="gp-s">
                        <span className={p.status}>{p.status.toUpperCase()}</span>
                        <span>{p.sub}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href={`/daos/${dao.slug}`}
                className="btn-mc btn-mc-primary"
                style={{ justifyContent: 'center' }}
              >
                Open full governance report →
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
