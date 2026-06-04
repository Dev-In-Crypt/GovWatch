'use client';

export interface OrbitalDao {
  id: string;
  slug: string;
  name: string;
  mono: string;
  color: string;
  glow: string;
  score: number;
  tag: 'good' | 'watch' | 'risk';
  tagLabel: string;
  turnout: number;
  proposals30: number;
  treasury: string;
  holders: string;
  breakdown: Record<string, number>;
  recentProposals: Array<{ title: string; status: 'pass' | 'fail' | 'live'; sub: string }>;
  ring?: 2 | 3 | 4;
  delay?: number;
}

export function Planet({
  dao,
  geo,
  isActive,
  onOpen,
}: {
  dao: OrbitalDao;
  geo: { d: string; dur: string };
  isActive: boolean;
  onOpen: (d: OrbitalDao) => void;
}) {
  return (
    <div
      className="orbit"
      style={{
        ['--d' as never]: geo.d,
        ['--dur' as never]: geo.dur,
        ['--delay' as never]: (dao.delay ?? 0) + 's',
        ['--p-color' as never]: dao.color,
        ['--p-glow' as never]: dao.glow,
      }}
    >
      <div className="orbit-spin">
        <div className="planet-holder">
          <div className="planet-upright">
            <button
              className={'planet' + (isActive ? ' active' : '')}
              style={{
                ['--p-color' as never]: dao.color,
                ['--p-glow' as never]: dao.glow,
              }}
              onClick={() => onOpen(dao)}
              aria-label={`${dao.name} governance detail`}
            >
              {dao.mono}
            </button>
            <div className="planet-tip">
              <div className="pt-head">
                <span className="pt-name">{dao.name}</span>
                <span
                  className="pill"
                  style={{ background: 'hsl(var(--indigo) / 0.12)' }}
                >
                  {dao.tagLabel}
                </span>
              </div>
              <div className="pt-row">
                <span>Democracy score</span>
                <span style={{ color: '#fff' }}>{dao.score.toFixed(1)}</span>
              </div>
              <div className="pt-row">
                <span>Voter turnout</span>
                <span>{dao.turnout.toFixed(1)}%</span>
              </div>
              <div className="pt-row">
                <span>Proposals · 30d</span>
                <span>{dao.proposals30}</span>
              </div>
              <div
                className="pt-row"
                style={{ marginTop: 7, color: 'hsl(var(--indigo-bright))' }}
              >
                <span style={{ color: 'hsl(var(--indigo-bright))' }}>
                  Click to inspect →
                </span>
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
