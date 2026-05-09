const orbs = [
  { size: 420, top: '-8%', left: '-5%', color: 'rgba(56,189,248,0.18)', dur: 22, delay: 0 },
  { size: 340, top: '60%', right: '-8%', color: 'rgba(236,72,153,0.12)', dur: 28, delay: 4 },
  { size: 280, top: '30%', left: '60%', color: 'rgba(56,189,248,0.1)', dur: 18, delay: 8 },
  { size: 200, top: '80%', left: '10%', color: 'rgba(236,72,153,0.09)', dur: 24, delay: 2 },
  { size: 160, top: '15%', right: '15%', color: 'rgba(14,165,233,0.12)', dur: 20, delay: 6 },
];

const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: Math.random() * 6 + 3,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  dur: Math.random() * 12 + 8,
  delay: Math.random() * 8,
  opacity: Math.random() * 0.4 + 0.1,
}));

export default function ParticleBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden',
    }}>
      {/* Blobs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: orb.color,
            filter: 'blur(60px)',
            top: orb.top,
            left: (orb as any).left,
            right: (orb as any).right,
            animation: `floatSlow ${orb.dur}s ease-in-out ${orb.delay}s infinite`,
          }}
        />
      ))}

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            top: p.top,
            left: p.left,
            opacity: p.opacity,
            background: p.id % 3 === 0
              ? 'rgba(236,72,153,0.5)'
              : p.id % 3 === 1
              ? 'rgba(56,189,248,0.5)'
              : 'rgba(14,165,233,0.4)',
            animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
