export default function Briefing({ operator, onLaunch }) {
  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'Times New Roman', Times, serif", color: "#e8e8e8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(0, 150, 255, 0.5); }
          50% { text-shadow: 0 0 30px rgba(0, 150, 255, 1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>

      {/* Ocean Background */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "radial-gradient(ellipse at center, #001020 0%, #000000 100%)", zIndex: 0 }} />

      {/* Animated Rings */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }} xmlns="http://www.w3.org/2000/svg">
        {[...Array(6)].map((_, i) => (
          <ellipse key={i} cx="50%" cy="50%" rx={`${20 + i * 12}%`} ry={`${10 + i * 6}%`}
            fill="none" stroke={`rgba(0, 100, 200, ${0.08 - i * 0.01})`} strokeWidth="1"
            style={{ animation: `pulse ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </svg>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>

        {/* Icon */}
        <div style={{ fontSize: "50px", marginBottom: "16px", animation: "float 3s ease-in-out infinite" }}>
          🌊
        </div>

        {/* Title */}
        <h1 style={{ color: "#ffffff", fontSize: "36px", margin: "0 0 8px", letterSpacing: "6px", animation: "glow 2s ease-in-out infinite" }}>
          UNDERWATER VEHICLE
        </h1>

        <p style={{ color: "#4488aa", fontSize: "14px", margin: "0 0 4px", letterSpacing: "4px" }}>
          MISSION CONTROL SYSTEM
        </p>

        <p style={{ color: "#223344", fontSize: "12px", margin: "0 0 48px", letterSpacing: "2px" }}>
          NATIONAL INSTITUTE OF OCEAN TECHNOLOGY
        </p>

        {/* Launch Button */}
        <button
          onClick={onLaunch}
          style={{ padding: "18px 70px", background: "linear-gradient(to right, #003366, #0066cc)", border: "2px solid #0088ff", borderRadius: "8px", color: "#ffffff", fontSize: "18px", letterSpacing: "4px", cursor: "pointer", fontFamily: "'Times New Roman', Times, serif", animation: "glow 2s infinite" }}>
          🚀 LAUNCH
        </button>

      </div>

    </div>
  );
}