const BUBBLES = [
  {size: 55, left: '8%', bottom: -60, duration: '13s', delay: '0s'},
  {size: 85, left: '22%', bottom: -90, duration: '17s', delay: '2s'},
  {size: 40, left: '40%', bottom: -45, duration: '11s', delay: '5s'},
  {size: 110, left: '60%', bottom: -120, duration: '21s', delay: '1s'},
  {size: 65, left: '78%', bottom: -70, duration: '15s', delay: '4s'},
  {size: 48, left: '90%', bottom: -50, duration: '12s', delay: '7s'},
  {size: 95, left: '32%', bottom: -100, duration: '19s', delay: '8s'},
  {size: 70, left: '14%', bottom: -75, duration: '16s', delay: '10s'},
];

export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{
        background:
          'radial-gradient(circle at 20% 20%, #1e3a8a 0%, #0f172a 50%, #020617 100%)',
      }}
    >
      {/* Ambient Animated Glowing Blobs */}
      <div
        className="auth-bg-blob"
        style={{
          width: 380,
          height: 380,
          background: '#3b82f6',
          opacity: 0.38,
          top: -80,
          left: -80,
        }}
      />
      <div
        className="auth-bg-blob"
        style={{
          width: 440,
          height: 440,
          background: '#0ea5e9',
          opacity: 0.38,
          bottom: -100,
          right: -80,
          animationDuration: '22s',
          animationDelay: '-5s',
        }}
      />
      <div
        className="auth-bg-blob"
        style={{
          width: 300,
          height: 300,
          background: '#f59e0b',
          opacity: 0.24,
          top: '40%',
          left: '65%',
          animationDuration: '16s',
          animationDelay: '-8s',
        }}
      />
      <div
        className="auth-bg-blob"
        style={{
          width: 320,
          height: 320,
          background: '#2563eb',
          opacity: 0.3,
          top: '15%',
          right: '15%',
          animationDuration: '20s',
          animationDelay: '-3s',
        }}
      />

      {/* Floating Glass Bubbles */}
      <div className="absolute inset-0 overflow-hidden">
        {BUBBLES.map((bubble, idx) => (
          <div
            key={idx}
            className="glass-bubble"
            style={{
              width: bubble.size,
              height: bubble.size,
              left: bubble.left,
              bottom: bubble.bottom,
              animationDuration: bubble.duration,
              animationDelay: bubble.delay,
            }}
          />
        ))}
      </div>

      {/* Animated Smooth Parallax Waves */}
      <div className="absolute left-0 right-0 bottom-0 w-full h-[180px] overflow-hidden">
        <svg
          className="relative w-full h-full min-h-[120px] max-h-[180px] -mb-[7px]"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          shapeRendering="auto"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
            />
          </defs>
          <g>
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="0"
              fill="rgba(37, 99, 235, 0.18)"
              className="parallax-wave-1"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="3"
              fill="rgba(14, 165, 233, 0.22)"
              className="parallax-wave-2"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="5"
              fill="rgba(59, 130, 246, 0.28)"
              className="parallax-wave-3"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="7"
              fill="rgba(15, 23, 42, 0.65)"
              className="parallax-wave-4"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
