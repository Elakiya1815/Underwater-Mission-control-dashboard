import { useState, useRef } from "react";

const VEHICLE_COLORS = ["#4fc3f7", "#81c784", "#ff7043", "#ffb74d", "#ce93d8"];

function getFormationOffsets(count) {
  if (count === 1) return [{ dx: 0, dy: 0 }];
  if (count === 2) return [{ dx: -3, dy: 0 }, { dx: 3, dy: 0 }];
  if (count === 3) return [{ dx: 0, dy: -3 }, { dx: -3, dy: 3 }, { dx: 3, dy: 3 }];
  if (count === 4) return [{ dx: 0, dy: -3 }, { dx: -3, dy: 0 }, { dx: 3, dy: 0 }, { dx: 0, dy: 3 }];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { dx: Math.cos(angle) * 4, dy: Math.sin(angle) * 4 };
  });
}

function generateLawnMower({ areaWidth, areaLength, laneSpacing }) {
  // ── Uniform scale — preserves aspect ratio exactly ────────
 const GRID_W   = 98;
  const GRID_H   = 72;
  const MARGIN_X = 1;
  const MARGIN_Y = 15;

  const scaleX  = GRID_W / areaWidth;
  const scaleY  = GRID_H / areaLength;
  const scale   = Math.min(scaleX, scaleY);   // uniform — no distortion

  const scaledW = areaWidth   * scale;         // actual width  on grid %
  const scaledH = areaLength  * scale;         // actual height on grid %
  const scaledS = laneSpacing * scale;         // lane gap on grid %

  // Center the pattern
  const originX = MARGIN_X + (GRID_W - scaledW) / 2;
  const originY = MARGIN_Y + (GRID_H - scaledH) / 2;
  const endX    = originX + scaledW;
  const endY    = originY + scaledH;

  // ── Count lanes exactly covering the area ────────────────
  // First lane at originY, last lane at or before endY
  // numLanes = floor(areaLength / laneSpacing) + 1
  const numLanes = Math.floor(areaLength / laneSpacing) + 1;

  const waypoints = [];
  let label      = 1;
  let goingRight = true;   // alternates each lane — true boustrophedon

  for (let lane = 0; lane < numLanes; lane++) {
    // ── Lane Y position ────────────────────────────────────
    // Last lane must sit exactly at endY (full coverage)
    let laneY;
    if (lane === numLanes - 1) {
      laneY = endY;          // snap last lane to bottom boundary
    } else {
      laneY = originY + lane * scaledS;
    }

    // Safety clamp — never exceed grid
    laneY = Math.min(endY, Math.max(originY, laneY));

    // ── Lane X: full width each pass ──────────────────────
    // goingRight  → start at LEFT (originX), end at RIGHT (endX)
    // goingLeft   → start at RIGHT (endX),   end at LEFT (originX)
    const startX = goingRight ? originX : endX;
    const stopX  = goingRight ? endX    : originX;

    // Push start of lane
    waypoints.push({
      x:     parseFloat(startX.toFixed(3)),
      y:     parseFloat(laneY.toFixed(3)),
      label: String(label++),
    });

    // Push end of lane (U-turn point)
    waypoints.push({
      x:     parseFloat(stopX.toFixed(3)),
      y:     parseFloat(laneY.toFixed(3)),
      label: String(label++),
    });

    // Flip direction for next lane
    goingRight = !goingRight;
  }

  return { waypoints, originX, originY, scaledW, scaledH, scale, numLanes };
}

// Grid % → real metres (for backend)
const toRealX = (x) => parseFloat(((x / 100) * 1000).toFixed(1));
const toRealY = (y) => parseFloat(((y / 88)  * 6000).toFixed(1));

export default function AddVehicle({ onEnterDashboard }) {
  const [vehicles, setVehicles]         = useState([]);
  const [ip, setIp]                     = useState("");
  const [port, setPort]                 = useState("");
  const [error, setError]               = useState("");
  const [waypoints, setWaypoints]       = useState([]);
  const [waypointMode, setWaypointMode] = useState("manual");
  const [lmPreview, setLmPreview]       = useState(null);

  const [lmAreaWidth,   setLmAreaWidth]   = useState("500");
  const [lmAreaLength,  setLmAreaLength]  = useState("3000");
  const [lmLaneSpacing, setLmLaneSpacing] = useState("500");
  const [lmError,       setLmError]       = useState("");

  const gridRef = useRef(null);

  // ── CHANGE 1: No duplicate IP check — same server IP used for all vehicles ──
  // ── CHANGE 2: Name is VEHICLE-1 with DASH (matches backend vehicle_id)     ──
  const handleAdd = () => {
    if (!ip.trim() || !port.trim()) { setError("Please enter both IP and Port!"); return; }
    if (isNaN(parseInt(port.trim()))) { setError("Port must be a number!"); return; }
    if (vehicles.length >= 5) { setError("Maximum 5 vehicles!"); return; }

    setVehicles(prev => [...prev, {
      id:   prev.length + 1,
      ip:   ip.trim(),
      port: port.trim(),
      name: `VEHICLE-${prev.length + 1}`,   // ← DASH not SPACE, matches backend
    }]);
    // Keep IP so user can quickly add next vehicle to same server
    setPort("");
    setError("");
  };

  const handleRemove = (id) => {
    setVehicles(prev => {
      const filtered = prev.filter(v => v.id !== id);
      return filtered.map((v, i) => ({ ...v, id: i + 1, name: `VEHICLE-${i + 1}` }));
    });
  };

  const handleGridClick = (e) => {
    if (waypointMode !== "manual") return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setWaypoints(prev => [...prev, {
      x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)), label: String(prev.length + 1),
    }]);
  };

  const handleGenerateLawnMower = () => {
    const w  = parseFloat(lmAreaWidth);
    const l  = parseFloat(lmAreaLength);
    const sp = parseFloat(lmLaneSpacing);
    if ([w, l, sp].some(isNaN) || w <= 0 || l <= 0 || sp <= 0) {
      setLmError("Please enter valid positive numbers!"); return;
    }
    if (sp > l)   { setLmError("Lane spacing must be ≤ area length!"); return; }
    if (w > 1000) { setLmError("Width must be ≤ 1000m!"); return; }
    if (l > 6000) { setLmError("Length must be ≤ 6000m!"); return; }
    setLmError("");
    const result = generateLawnMower({ areaWidth: w, areaLength: l, laneSpacing: sp });
    setWaypoints(result.waypoints);
    setLmPreview({ originX: result.originX, originY: result.originY,
                   scaledW: result.scaledW, scaledH: result.scaledH, scale: result.scale });
  };

  const handleClearWaypoints = () => { setWaypoints([]); setLmPreview(null); };

  // ── CHANGE 3: Pass realWaypoints (metres) to App.jsx as 3rd argument ──
  const handleLaunch = () => {
    if (vehicles.length === 0 || waypoints.length === 0) return;
    // Convert grid % → metres for backend
    const realWaypoints = waypoints.map(wp => [toRealX(wp.x), toRealY(wp.y)]);
    onEnterDashboard(vehicles, waypoints, realWaypoints);
  };

  const offsets = getFormationOffsets(vehicles.length);
  const formationName = ["", "SINGLE", "LINE", "TRIANGLE", "DIAMOND"][vehicles.length] || "FORMATION";
  const yLines = [0, 1000, 2000, 3000, 4000, 5000, 6000];
  const xLines = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const canLaunch = vehicles.length > 0 && waypoints.length > 0;

  return (
    <div style={{
      background: "#000", minHeight: "100vh",
      fontFamily: "'Times New Roman', Times, serif",
      color: "#e8e8e8", display: "flex", flexDirection: "column",
      padding: "24px", boxSizing: "border-box",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(0,150,255,0.5); }
          50%       { text-shadow: 0 0 30px rgba(0,150,255,1); }
        }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "radial-gradient(ellipse at center, #001020 0%, #000 100%)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex",
        flexDirection: "column", height: "100%", gap: "16px" }}>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#ffffff", fontSize: "22px", margin: "0 0 4px",
            letterSpacing: "5px", animation: "glow 2s ease-in-out infinite" }}>
            🌊 MISSION SETUP
          </h1>
          <p style={{ color: "#4488aa", fontSize: "11px", margin: 0, letterSpacing: "3px" }}>
            NATIONAL INSTITUTE OF OCEAN TECHNOLOGY — ADD VEHICLES & WAYPOINTS
          </p>
        </div>

        <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>

          {/* LEFT panel */}
          <div style={{ width: "340px", flexShrink: 0, display: "flex",
            flexDirection: "column", gap: "12px", overflowY: "auto" }}>

            {/* Add Vehicle */}
            <div style={{ background: "#0d1426", border: "1px solid #4488aa",
              borderRadius: "12px", padding: "16px" }}>
              <div style={{ color: "#4488aa", fontSize: "10px", letterSpacing: "3px",
                marginBottom: "8px", borderLeft: "3px solid #4488aa", paddingLeft: "8px" }}>
                ADD VEHICLE
              </div>

              {/* Info note */}
              <div style={{ color: "#4488aa", fontSize: "9px", marginBottom: "12px",
                padding: "7px 10px", background: "#080e1a", borderRadius: "6px",
                border: "1px dashed #334466", lineHeight: 1.6 }}>
                💡 All vehicles connect to the <b style={{ color: "#4fc3f7" }}>same server IP</b>.<br />
                Enter it once — reuse for each vehicle. Each gets a unique ID automatically.
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ color: "#4488aa", fontSize: "10px", letterSpacing: "2px",
                  display: "block", marginBottom: "5px" }}>SERVER IP ADDRESS</label>
                <input type="text" value={ip}
                  onChange={e => { setIp(e.target.value); setError(""); }}
                  placeholder="e.g. 192.168.0.50"
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  style={{ width: "100%", padding: "9px 12px", background: "#111827",
                    border: "1px solid #4488aa", borderRadius: "6px", color: "#fff",
                    fontSize: "12px", fontFamily: "'Times New Roman', Times, serif",
                    outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ color: "#4488aa", fontSize: "10px", letterSpacing: "2px",
                  display: "block", marginBottom: "5px" }}>SERVER PORT</label>
                <input type="text" value={port}
                  onChange={e => { setPort(e.target.value); setError(""); }}
                  placeholder="e.g. 8000"
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  style={{ width: "100%", padding: "9px 12px", background: "#111827",
                    border: "1px solid #4488aa", borderRadius: "6px", color: "#fff",
                    fontSize: "12px", fontFamily: "'Times New Roman', Times, serif",
                    outline: "none", boxSizing: "border-box" }} />
              </div>

              {error && <div style={{ color: "#ff4444", fontSize: "10px", marginBottom: "8px" }}>⚠️ {error}</div>}

              <button onClick={handleAdd} style={{
                width: "100%", padding: "10px",
                background: "linear-gradient(to right, #003366, #0066cc)",
                border: "1px solid #0088ff", borderRadius: "6px",
                color: "#fff", fontSize: "12px", letterSpacing: "2px",
                cursor: "pointer", fontFamily: "'Times New Roman', Times, serif" }}>
                ➕ ADD VEHICLE-{vehicles.length + 1}
              </button>
            </div>

            {/* Vehicle list */}
            {vehicles.length > 0 && (
              <div style={{ background: "#0d1426", border: "1px solid #334466",
                borderRadius: "12px", padding: "16px" }}>
                <div style={{ color: "#4488aa", fontSize: "10px", letterSpacing: "3px",
                  marginBottom: "10px", borderLeft: "3px solid #4488aa", paddingLeft: "8px",
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>VEHICLES ({vehicles.length})</span>
                  <span style={{ color: "#ffd700", fontSize: "9px", letterSpacing: "2px" }}>
                    {formationName} FORMATION
                  </span>
                </div>
                {vehicles.map((v, i) => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center",
                    gap: "8px", padding: "8px 10px", marginBottom: "6px",
                    background: "#111827", borderRadius: "8px",
                    border: `1px solid ${VEHICLE_COLORS[i % 5]}44` }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%",
                      background: VEHICLE_COLORS[i % 5], flexShrink: 0 }} />
                    <span style={{ color: VEHICLE_COLORS[i % 5], fontSize: "11px",
                      fontWeight: "bold", flex: 1 }}>{v.name}</span>
                    <span style={{ color: "#607090", fontSize: "9px" }}>{v.ip}:{v.port}</span>
                    <button onClick={() => handleRemove(v.id)} style={{
                      padding: "2px 8px", background: "#2a0a0a",
                      border: "1px solid #ff4444", borderRadius: "4px",
                      color: "#ff4444", fontSize: "9px", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
                {vehicles.length > 1 && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ color: "#a0a0a0", fontSize: "9px", letterSpacing: "2px",
                      marginBottom: "6px", textAlign: "center" }}>FORMATION PREVIEW</div>
                    <svg width="100%" height="70" viewBox="-12 -12 24 24"
                      style={{ background: "#080e1a", borderRadius: "6px", border: "1px solid #223344" }}>
                      {offsets.map((o, i) =>
                        offsets.slice(i + 1).map((o2, j) => (
                          <line key={`${i}-${j}`} x1={o.dx} y1={o.dy} x2={o2.dx} y2={o2.dy}
                            stroke="#334466" strokeWidth="0.5" strokeDasharray="1,0.5" />
                        ))
                      )}
                      <polygon points="0,-8 -1,-5 1,-5" fill="#ffd70055" />
                      {offsets.map((o, i) => (
                        <g key={i}>
                          <circle cx={o.dx} cy={o.dy} r="1.8" fill={VEHICLE_COLORS[i % 5]} opacity="0.9" />
                          <text x={o.dx} y={o.dy + 3.5} textAnchor="middle"
                            fill={VEHICLE_COLORS[i % 5]} fontSize="2.5">V{i+1}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Waypoint Mode */}
            <div style={{ background: "#0d1426", border: "1px solid #334466",
              borderRadius: "12px", padding: "16px" }}>
              <div style={{ color: "#4488aa", fontSize: "10px", letterSpacing: "3px",
                marginBottom: "12px", borderLeft: "3px solid #4488aa", paddingLeft: "8px" }}>
                WAYPOINT MODE
              </div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <button onClick={() => { setWaypointMode("manual"); setWaypoints([]); setLmPreview(null); }}
                  style={{ flex: 1, padding: "8px",
                    background: waypointMode === "manual" ? "#003366" : "#111827",
                    border: `1px solid ${waypointMode === "manual" ? "#4488aa" : "#334466"}`,
                    borderRadius: "6px", color: waypointMode === "manual" ? "#4fc3f7" : "#607090",
                    fontSize: "10px", letterSpacing: "1px", cursor: "pointer",
                    fontFamily: "'Times New Roman', Times, serif" }}>
                  🖱️ MANUAL
                </button>
                <button onClick={() => { setWaypointMode("lawnmower"); setWaypoints([]); setLmPreview(null); }}
                  style={{ flex: 1, padding: "8px",
                    background: waypointMode === "lawnmower" ? "#003322" : "#111827",
                    border: `1px solid ${waypointMode === "lawnmower" ? "#81c784" : "#334466"}`,
                    borderRadius: "6px", color: waypointMode === "lawnmower" ? "#81c784" : "#607090",
                    fontSize: "10px", letterSpacing: "1px", cursor: "pointer",
                    fontFamily: "'Times New Roman', Times, serif" }}>
                  🌿 LAWN MOWER
                </button>
              </div>

              {waypointMode === "manual" && (
                <div style={{ color: "#446688", fontSize: "10px", textAlign: "center",
                  padding: "8px", background: "#080e1a", borderRadius: "6px",
                  border: "1px dashed #334466" }}>
                  Click anywhere on the grid →<br/>to place waypoints manually
                </div>
              )}

              {waypointMode === "lawnmower" && (
                <div>
                  <div style={{ color: "#81c784", fontSize: "9px", letterSpacing: "2px",
                    marginBottom: "10px" }}>AREA PARAMETERS (metres)</div>
                  {[
                    ["Area Width (m)",   lmAreaWidth,   setLmAreaWidth,   "max 1000m"],
                    ["Area Length (m)",  lmAreaLength,  setLmAreaLength,  "max 6000m"],
                    ["Lane Spacing (m)", lmLaneSpacing, setLmLaneSpacing, "gap between lanes"],
                  ].map(([label, val, setter, hint]) => (
                    <div key={label} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <label style={{ color: "#81c784", fontSize: "9px", letterSpacing: "1px" }}>{label}</label>
                        <span style={{ color: "#446688", fontSize: "8px" }}>{hint}</span>
                      </div>
                      <input type="number" value={val} onChange={e => setter(e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", background: "#111827",
                          border: "1px solid #335533", borderRadius: "5px", color: "#81c784",
                          fontSize: "11px", fontFamily: "'Times New Roman', Times, serif",
                          outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                  {lmError && <div style={{ color: "#ff4444", fontSize: "10px", marginBottom: "8px" }}>⚠️ {lmError}</div>}
                  <button onClick={handleGenerateLawnMower} style={{
                    width: "100%", padding: "10px",
                    background: "linear-gradient(to right, #003322, #006644)",
                    border: "1px solid #81c784", borderRadius: "6px",
                    color: "#81c784", fontSize: "11px", letterSpacing: "2px",
                    cursor: "pointer", fontFamily: "'Times New Roman', Times, serif", marginTop: "4px" }}>
                    🌿 GENERATE PATTERN
                  </button>
                </div>
              )}
            </div>

            {/* Waypoint list */}
            {waypoints.length > 0 && (
              <div style={{ background: "#0d1426", border: "1px solid #334466",
                borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ color: "#ffd700", fontSize: "10px", letterSpacing: "3px",
                    borderLeft: "3px solid #ffd700", paddingLeft: "8px" }}>
                    WAYPOINTS ({waypoints.length})
                    {waypointMode === "lawnmower" && (
                      <span style={{ color: "#81c784", marginLeft: "8px", fontSize: "9px" }}>🌿 LAWN MOWER</span>
                    )}
                  </div>
                  <button onClick={handleClearWaypoints} style={{
                    padding: "3px 10px", background: "#2a1a1a",
                    border: "1px solid #ff4444", borderRadius: "4px",
                    color: "#ff4444", fontSize: "9px", cursor: "pointer" }}>CLEAR</button>
                </div>
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {waypoints.map((wp, i) => {
                    const isStart = i === 0, isEnd = i === waypoints.length - 1;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "4px 8px", marginBottom: "3px",
                        background: isStart ? "#003322" : isEnd ? "#330022" : "#111827",
                        borderRadius: "4px",
                        borderLeft: `2px solid ${isStart ? "#81c784" : isEnd ? "#ff4444" : "#ffd700"}` }}>
                        <span style={{ color: isStart ? "#81c784" : isEnd ? "#ff4444" : "#ffd700", fontSize: "9px" }}>
                          {isStart ? "🟢" : isEnd ? "🔴" : "▷"} WP {wp.label}
                        </span>
                        <span style={{ color: "#607090", fontSize: "8px" }}>
                          X={toRealX(wp.x)}m D={toRealY(wp.y)}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Launch */}
            <button onClick={handleLaunch} disabled={!canLaunch} style={{
              width: "100%", padding: "14px",
              background: canLaunch ? "linear-gradient(to right, #003366, #0066cc)" : "#1a2a1a",
              border: `2px solid ${canLaunch ? "#0088ff" : "#333"}`,
              borderRadius: "8px", color: canLaunch ? "#fff" : "#444",
              fontSize: "14px", letterSpacing: "4px",
              cursor: canLaunch ? "pointer" : "not-allowed",
              fontFamily: "'Times New Roman', Times, serif",
              animation: canLaunch ? "glow 2s infinite" : "none" }}>
              🚀 LAUNCH MISSION
            </button>
            {!canLaunch && (
              <div style={{ color: "#446688", fontSize: "10px", textAlign: "center",
                letterSpacing: "1px", marginTop: "-6px" }}>
                {vehicles.length === 0 ? "Add at least one vehicle" : "Generate or place waypoints first"}
              </div>
            )}
            {canLaunch && (
              <div style={{ background: "#001a0a", border: "1px solid #006644",
                borderRadius: "8px", padding: "10px", fontSize: "9px",
                color: "#81c784", lineHeight: 1.8, letterSpacing: "1px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>✅ READY TO LAUNCH</div>
                <div>Vehicles  : {vehicles.length} ({formationName})</div>
                <div>Waypoints : {waypoints.length}</div>
                <div>Algorithm : Pure Pursuit + Formation</div>
                <div>Start     : ALL vehicles simultaneously</div>
              </div>
            )}
          </div>

          {/* RIGHT: Grid */}
          <div style={{ flex: 1, background: "#0d1426", border: "1px solid #c0c0c0",
            borderRadius: "12px", padding: "16px", display: "flex",
            flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ color: "#ffffff", fontSize: "14px", letterSpacing: "3px", margin: 0 }}>
                {waypointMode === "lawnmower" ? "🌿 LAWN MOWER PATH PREVIEW" : "🗺️ CLICK TO PLACE WAYPOINTS"}
              </h2>
              <div style={{ color: "#ffd700", fontSize: "10px", letterSpacing: "2px" }}>
                {waypoints.length === 0
                  ? (waypointMode === "manual" ? "Click grid to place waypoints" : "Set params → Generate Pattern")
                  : `${waypoints.length} waypoints — ${waypointMode === "lawnmower" ? "lawn mower" : "manual"}`}
              </div>
            </div>

            <div style={{ textAlign: "center", color: "#a0a0a0", fontSize: "11px",
              letterSpacing: "2px", marginBottom: "4px" }}>← HORIZONTAL POSITION (m) →</div>

            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", marginRight: "6px" }}>
                <span style={{ color: "#a0a0a0", fontSize: "11px", letterSpacing: "2px",
                  writingMode: "vertical-rl", transform: "rotate(180deg)" }}>↑ DEPTH (m) ↓</span>
              </div>

              <div ref={gridRef} onClick={handleGridClick} style={{
                flex: 1, position: "relative",
                background: "linear-gradient(to bottom, #001a33 0%, #001020 40%, #000810 70%, #000508 100%)",
                borderRadius: "8px",
                border: `2px solid ${waypointMode === "lawnmower" ? "#81c784" : "#ffd700"}`,
                overflow: "hidden", cursor: waypointMode === "manual" ? "crosshair" : "default",
              }}>
                {xLines.map(x => (
                  <div key={x} style={{ position: "absolute", left: `${x}%`,
                    top: 0, bottom: 0, borderLeft: "1px solid rgba(192,192,192,0.15)", zIndex: 1 }}>
                    <span style={{ position: "absolute", bottom: "4px", left: "2px",
                      color: "#c0c0c0", fontSize: "8px", opacity: 0.6 }}>{Math.round(x * 10)}m</span>
                  </div>
                ))}
                {yLines.map(d => (
                  <div key={d} style={{ position: "absolute", top: `${(d / 6000) * 93}%`,
                    left: 0, right: 0, borderTop: "1px solid rgba(192,192,192,0.15)", zIndex: 1 }}>
                    <span style={{ position: "absolute", left: "4px", top: "2px",
                      color: "#c0c0c0", fontSize: "8px", opacity: 0.6 }}>{d}m</span>
                  </div>
                ))}

                <div style={{ position:"absolute", right:"8px", top:"2%",  color:"#ffffff", fontSize:"10px", opacity:0.7 }}>☀️ Sunlight</div>
                <div style={{ position:"absolute", right:"8px", top:"18%", color:"#c0c0c0", fontSize:"10px", opacity:0.7 }}>🌑 Twilight</div>
                <div style={{ position:"absolute", right:"8px", top:"40%", color:"#909090", fontSize:"10px", opacity:0.7 }}>🌊 Midnight</div>
                <div style={{ position:"absolute", right:"8px", top:"68%", color:"#606060", fontSize:"10px", opacity:0.7 }}>⬛ Abyssal</div>

                <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                  style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", zIndex:2, pointerEvents:"none" }}>

                  {waypointMode === "lawnmower" && lmPreview && (
                    <>
                      <rect x={lmPreview.originX} y={lmPreview.originY}
                        width={lmPreview.scaledW} height={lmPreview.scaledH}
                        fill="rgba(129,199,132,0.05)" stroke="#81c784" strokeWidth="0.4"
                        opacity="0.7" strokeDasharray="2,1" vectorEffect="non-scaling-stroke" />
                      <text x={lmPreview.originX + lmPreview.scaledW / 2}
                        y={lmPreview.originY - 1.5} textAnchor="middle"
                        fill="#81c784" fontSize="2.2" fontFamily="monospace">
                        {parseFloat(lmAreaWidth)}m × {parseFloat(lmAreaLength)}m
                        {"  "}(scale: {lmPreview.scale.toFixed(4)}/m)
                      </text>
                    </>
                  )}

                  {waypoints.length > 1 && waypoints.map((wp, i) => {
                    if (i === 0) return null;
                    const prev = waypoints[i - 1];
                    const isLane = Math.abs(prev.y - wp.y) < 0.01;
                    return (
                      <line key={"line-" + i} x1={prev.x} y1={prev.y} x2={wp.x} y2={wp.y}
                        stroke={isLane ? "#81c784" : "#4488aa"} strokeWidth="0.5"
                        opacity={isLane ? 0.8 : 0.5} strokeDasharray={isLane ? "0" : "1,1"}
                        vectorEffect="non-scaling-stroke" />
                    );
                  })}

                  {vehicles.length > 1 && waypoints.map((wp, wi) =>
                    offsets.map((o, vi) => (
                      <circle key={`f-${wi}-${vi}`}
                        cx={Math.max(0, Math.min(100, wp.x + o.dx))}
                        cy={Math.max(0, Math.min(100, wp.y + o.dy))}
                        r="0.5" fill={VEHICLE_COLORS[vi % 5]} opacity="0.3"
                        vectorEffect="non-scaling-stroke" />
                    ))
                  )}

                  {waypoints.map((wp, i) => {
                    const isStart = i === 0, isEnd = i === waypoints.length - 1;
                    const show = isStart || isEnd || waypointMode === "manual" || i % 2 === 0;
                    return (
                      <g key={"wp-" + i}>
                        <circle cx={wp.x} cy={wp.y} r={isStart || isEnd ? 1.8 : 0.9}
                          fill={isStart ? "#81c784" : isEnd ? "#ff4444" : "#ffd700"}
                          vectorEffect="non-scaling-stroke" />
                        {show && (
                          <text x={wp.x + (isStart ? -3 : 1.5)} y={wp.y - 2}
                            fill={isStart ? "#81c784" : isEnd ? "#ff4444" : "#ffd700"}
                            fontSize="2.2" fontFamily="Times New Roman">
                            {isStart ? "START" : isEnd ? "END" : `WP${wp.label}`}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

            

                {waypoints.length === 0 && (
                  <div style={{ position:"absolute", top:"50%", left:"50%",
                    transform:"translate(-50%,-50%)", textAlign:"center",
                    color:"#446688", fontSize:"13px", pointerEvents:"none", zIndex:3 }}>
                    <div style={{ fontSize:"32px", marginBottom:"8px" }}>
                      {waypointMode === "manual" ? "🖱️" : "🌿"}
                    </div>
                    {waypointMode === "manual"
                      ? "Click anywhere to place waypoints"
                      : "Set parameters and click\nGENERATE PATTERN"}
                  </div>
                )}
              </div>
            </div>

            {waypointMode === "lawnmower" && waypoints.length > 0 && (
              <div style={{ display:"flex", gap:"16px", marginTop:"8px", fontSize:"9px", color:"#a0a0a0" }}>
                <span><span style={{ color:"#81c784" }}>━━</span> Lane (horizontal)</span>
                <span><span style={{ color:"#4488aa" }}>╌╌</span> Step (vertical)</span>
                <span><span style={{ color:"#81c784" }}>●</span> Start</span>
                <span><span style={{ color:"#ff4444" }}>●</span> End</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}