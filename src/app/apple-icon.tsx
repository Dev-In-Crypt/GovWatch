import { ImageResponse } from 'next/og';

// Next.js auto-generates the apple-touch-icon PNG from this JSX. Spec wants 180x180.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(circle at 50% 0%, #1a2348, #0A0E1A 70%)',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* outer cyan ring */}
        <div
          style={{
            position: 'absolute',
            width: 152,
            height: 152,
            borderRadius: 76,
            border: '2px solid rgba(34, 211, 238, 0.45)',
          }}
        />
        {/* inner indigo ring */}
        <div
          style={{
            position: 'absolute',
            width: 104,
            height: 104,
            borderRadius: 52,
            border: '3px solid rgba(129, 140, 248, 0.75)',
          }}
        />
        {/* core */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background:
              'radial-gradient(circle at 40% 35%, #818CF8, #6366F1 55%, #1A2348)',
            boxShadow: '0 0 28px rgba(99, 102, 241, 0.8)',
          }}
        />
        {/* cyan tick at top of inner ring */}
        <div
          style={{
            position: 'absolute',
            top: 39,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: '#22D3EE',
            boxShadow: '0 0 18px #22D3EE',
          }}
        />
      </div>
    ),
    size,
  );
}
