import React, { useState, useEffect, useRef } from "react";
import Briefing from "./briefing";
import AddVehicle from "./AddVehicle";

const VEHICLE_COLORS = ["#4fc3f7", "#81c784", "#ff7043", "#ffb74d", "#ce93d8", "#f06292", "#80cbc4", "#aed581"];

const getFormationOffsets = (count) => {
  if (count === 1) return [{ dx: 0, dy: 0 }];
  if (count === 2) return [{ dx: -3, dy: 0 }, { dx: 3, dy: 0 }];
  if (count === 3) return [{ dx: 0, dy: -3 }, { dx: -3, dy: 3 }, { dx: 3, dy: 3 }];
  if (count === 4) return [{ dx: 0, dy: -3 }, { dx: -3, dy: 0 }, { dx: 3, dy: 0 }, { dx: 0, dy: 3 }];
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { dx: Math.cos(a) * 4, dy: Math.sin(a) * 4 };
  });
};

const rotateOffset = (dx, dy, angleRad) => ({
  rdx: dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
  rdy: dx * Math.sin(angleRad) + dy * Math.cos(angleRad),
});

function HeadingCompass({ heading, color }) {
  const hdg = ((heading || 0) % 360 + 360) % 360;
  const R = 38, cx = 50, cy = 54;

  // Direction label
const dirLabel = (() => {
    // Convert grid heading (0°=East) → compass heading (0°=North) for label
    const compassHdg = (hdg + 90) % 360;
    if (compassHdg >= 337.5 || compassHdg < 22.5)  return "N";
    if (compassHdg < 67.5)  return "NE";
    if (compassHdg < 112.5) return "E";
    if (compassHdg < 157.5) return "SE";
    if (compassHdg < 202.5) return "S";
    if (compassHdg < 247.5) return "SW";
    if (compassHdg < 292.5) return "W";
    return "NW";
  })();

  // Cardinal + intercardinal ticks
  const ticks = [
    { deg: 0,   label: "N",  major: true,  red: true  },
    { deg: 45,  label: "NE", major: false, red: false },
    { deg: 90,  label: "E",  major: true,  red: false },
    { deg: 135, label: "SE", major: false, red: false },
    { deg: 180, label: "S",  major: true,  red: false },
    { deg: 225, label: "SW", major: false, red: false },
    { deg: 270, label: "W",  major: true,  red: false },
    { deg: 315, label: "NW", major: false, red: false },
  ];

  // Minor ticks every 10°
  const minorTicks = Array.from({ length: 36 }, (_, i) => i * 10).filter(
    d => ![0,45,90,135,180,225,270,315].includes(d)
  );

  const needleRad = (hdg * Math.PI) / 180;
  const nx = cx + Math.cos(needleRad) * (R - 10);
  const ny = cy + Math.sin(needleRad) * (R - 10);
  const tailX = cx - Math.cos(needleRad) * (R - 16);
  const tailY = cy - Math.sin(needleRad) * (R - 16);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
      {/* Degree + direction ABOVE compass */}
      <div style={{ textAlign: "center", lineHeight: 1.2 }}>
        <div style={{ color, fontSize: "11px", fontWeight: "bold",
          fontFamily: "monospace", letterSpacing: "1px" }}>
          {Math.round(hdg)}°
        </div>
        <div style={{ color: "#ffffff", fontSize: "9px",
          fontFamily: "monospace", letterSpacing: "2px" }}>
          {dirLabel}
        </div>
      </div>

      {/* Full circle compass */}
      <svg width="100" height="100" viewBox="0 0 100 108"
        style={{ display: "block", margin: "0 auto" }}>

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={R + 3}
          fill="#060c1a" stroke={color} strokeWidth="1" opacity="0.6" />

        {/* Inner background */}
        <circle cx={cx} cy={cy} r={R}
          fill="#0a0f1e" stroke={color} strokeWidth="0.5" opacity="0.4" />

        {/* Minor ticks every 10° */}
        {minorTicks.map(deg => {
          const rad = ((deg - 90) * Math.PI) / 180;
          return (
            <line key={deg}
              x1={cx + Math.cos(rad) * (R - 1)}
              y1={cy + Math.sin(rad) * (R - 1)}
              x2={cx + Math.cos(rad) * (R - 5)}
              y2={cy + Math.sin(rad) * (R - 5)}
              stroke="#334466" strokeWidth="0.6" />
          );
        })}

        {/* Major ticks + labels */}
        {ticks.map(({ deg, label, major, red }) => {
          const rad  = ((deg - 90) * Math.PI) / 180;
          const x1   = cx + Math.cos(rad) * (R - 1);
          const y1   = cy + Math.sin(rad) * (R - 1);
          const x2   = cx + Math.cos(rad) * (R - (major ? 10 : 6));
          const y2   = cy + Math.sin(rad) * (R - (major ? 10 : 6));
          const lx   = cx + Math.cos(rad) * (R - 16);
          const ly   = cy + Math.sin(rad) * (R - 16);
          const tickColor = red ? "#ff4444" : major ? color : "#446688";
          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={tickColor} strokeWidth={major ? 1.5 : 0.8} />
              {major && (
                <text x={lx} y={ly}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={red ? "#ff4444" : color}
                  fontSize={label.length === 1 ? "7" : "5.5"}
                  fontFamily="monospace" fontWeight="bold">
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {/* North indicator arc highlight */}
        <path
          d={`M ${cx + Math.cos((-105) * Math.PI/180) * R}
                ${cy + Math.sin((-105) * Math.PI/180) * R}
              A ${R} ${R} 0 0 1
                ${cx + Math.cos((-75) * Math.PI/180) * R}
                ${cy + Math.sin((-75) * Math.PI/180) * R}`}
          stroke="#ff444444" strokeWidth="3" fill="none" />

        {/* Crosshair lines */}
        <line x1={cx - R + 4} y1={cy} x2={cx + R - 4} y2={cy}
          stroke={color} strokeWidth="0.3" opacity="0.2" />
        <line x1={cx} y1={cy - R + 4} x2={cx} y2={cy + R - 4}
          stroke={color} strokeWidth="0.3" opacity="0.2" />

        {/* Needle — red tip toward heading, white tail */}
        <line x1={tailX} y1={tailY} x2={nx} y2={ny}
          stroke="#ff4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={tailX} y2={tailY}
          stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3.5" fill={color} />
        <circle cx={cx} cy={cy} r="1.8" fill="#0a0f1e" />
      </svg>
    </div>
  );
}

function DepthVisual({ depth, color }) {
  const d    = Math.max(0, parseFloat(depth) || 0);
  const barH = 160;

  // Triangle wave: 0→500m fills bar, 500→1000m empties, 1000→1500 fills again...
  const cycle  = 500;
  const mod    = d % (cycle * 2);
  const waveDep = mod <= cycle ? mod : (cycle * 2) - mod;
  const pct    = waveDep / cycle;      // 0.0 → 1.0
  const markerY = pct * barH;

  const labels = ["0m", "125m", "250m", "375m", "500m"];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div style={{ fontSize: "9px", color: "#a0a0a0", letterSpacing: "1px" }}>DEPTH</div>
      <div style={{ display: "flex", gap: "2px", alignItems: "stretch" }}>

        {/* Labels */}
        <div style={{ display: "flex", flexDirection: "column",
          justifyContent: "space-between", height: `${barH}px` }}>
          {labels.map((l, i) => (
            <div key={i} style={{ fontSize: "6px", color: "#446688",
              textAlign: "right", lineHeight: 1 }}>{l}</div>
          ))}
        </div>

        {/* Bar */}
        <div style={{ position: "relative", width: "22px", height: `${barH}px`,
          borderRadius: "4px", overflow: "hidden",
          background: "#050d1a", border: `1px solid ${color}44` }}>

          {/* Water fill from top */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%",
            height: `${pct * 100}%`,
            background: `linear-gradient(to bottom, #003366cc, ${color}88)`,
            transition: "height 0.2s ease",
          }} />

          {/* Marker */}
          <div style={{
            position: "absolute", top: `${markerY - 1.5}px`, left: 0,
            width: "100%", height: "3px",
            background: color, boxShadow: `0 0 6px ${color}`,
            transition: "top 0.2s ease",
          }} />
        </div>
      </div>

     {/* Actual depth value */}
      <div style={{ fontSize: "9px", color, fontWeight: "bold",
        fontVariantNumeric: "tabular-nums" }}>
        {waveDep.toFixed(0)}m
      </div>
    </div>
  );
}

function PitchVisual({ pitch, color }) {
  const p = Math.max(-90, Math.min(90, parseFloat(pitch) || 0));
  const pct = (p + 90) / 180;
  const barH = 160;
  const markerY = pct * barH;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div style={{ fontSize: "9px", color: "#a0a0a0", letterSpacing: "1px" }}>PITCH</div>
      <div style={{ position: "relative", width: "20px", height: `${barH}px`,
        borderRadius: "4px", background: "#0a0f1e", border: `1px solid ${color}44` }}>
        <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: "1px", background: "#ffd70066" }} />
        <div style={{ position: "absolute",
          top: p >= 0 ? "50%" : `${pct * 100}%`, left: 0, width: "100%",
          height: `${Math.abs(p) / 180 * 100}%`,
          background: p >= 0 ? "#4fc3f7" : "#ff7043", opacity: 0.6 }} />
        <div style={{ position: "absolute", top: `${markerY - 2}px`, left: 0,
          width: "100%", height: "3px", background: color, boxShadow: `0 0 4px ${color}` }} />
      </div>
      <div style={{ fontSize: "9px", color, fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
        {p.toFixed(1)}°
      </div>
    </div>
  );
}

function VehicleColumn({ v }) {
  const depth = parseFloat(v.depth) || 0;
  const pitch = parseFloat(v.pitch) || 0;
  const hdg   = ((v.heading || 0) % 360 + 360) % 360;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      padding: "10px 6px", background: "#0a0f1e",
      border: `1px solid ${v.color}44`, borderRadius: "8px",
      minWidth: "90px", maxWidth: "100px", gap: "10px" }}>
      <div style={{ color: v.color, fontSize: "8px", fontWeight: "bold",
        letterSpacing: "1px", textAlign: "center",
        borderBottom: `1px solid ${v.color}44`, width: "100%", paddingBottom: "6px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%",
          background: v.connected ? "#81c784" : "#ff4444", margin: "0 auto 3px" }} />
        {v.name}
      </div>
      <div style={{ width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "8px", color: "#a0a0a0", letterSpacing: "1px", marginBottom: "2px" }}>HEADING</div>
        <HeadingCompass heading={hdg} color={v.color} />
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        <DepthVisual depth={depth} color={v.color} />
        <PitchVisual pitch={pitch} color={v.color} />
      </div>
      <div style={{ width: "100%", fontSize: "8px", color: "#a0a0a0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span>HDG</span><span style={{ color: v.color, fontVariantNumeric: "tabular-nums" }}>{Math.round(hdg)}°</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span>PITCH</span><span style={{ color: v.color, fontVariantNumeric: "tabular-nums" }}>{pitch.toFixed(1)}°</span>
        </div>
       <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>DEPTH</span><span style={{ color: v.color, fontVariantNumeric: "tabular-nums" }}>
            {(() => {
              const cycle = 500;
              const mod = depth % (cycle * 2);
              const wave = mod <= cycle ? mod : (cycle * 2) - mod;
              return wave.toFixed(0);
            })()}m
          </span>
        </div>
      </div>
    </div>
  );
}

function AttitudeCanvas({ v }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = W / 2 - 6;
    const roll = parseFloat(v.roll) || 0;
    const yaw  = parseFloat(v.heading) || 0;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0f1e"; ctx.fill();
    const depthValue   = parseFloat(v.depth) || 0;
    const clampedDepth = Math.max(-3000, Math.min(3000, depthValue));
    const waterY       = cy - (clampedDepth / 3000) * R;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#001428"; ctx.fillRect(cx - R, cy - R, R * 2, waterY - (cy - R));
    ctx.fillStyle = "#003366"; ctx.fillRect(cx - R, waterY, R * 2, R * 2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = v.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy);
    ctx.rotate((roll * Math.PI) / 180 - Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -R + 8); ctx.lineTo(-5, -R + 18); ctx.lineTo(5, -R + 18);
    ctx.closePath(); ctx.fillStyle = v.color; ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - R * 0.45, cy); ctx.lineTo(cx - R * 0.12, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + R * 0.12, cy); ctx.lineTo(cx + R * 0.45, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.save(); ctx.translate(cx, cy);
    ctx.rotate((yaw * Math.PI) / 180);
    ctx.beginPath(); ctx.moveTo(0, -R + 10); ctx.lineTo(-4, -R + 19); ctx.lineTo(4, -R + 19);
    ctx.closePath(); ctx.fillStyle = "#ff4444"; ctx.fill(); ctx.restore();
  }, [v.pitch, v.roll, v.heading, v.color, v.depth]);
  return (
    <canvas ref={canvasRef} width={130} height={130}
      style={{ borderRadius: "50%", border: `1px solid ${v.color}44`, boxShadow: `0 0 8px ${v.color}33` }} />
  );
}

const createVehicleState = (id, name, ip, port) => ({
  id, ip, port,
  name,
  pos:            { x: 50, y: 33 },
  prevPos:        { x: 50, y: 33 },
  trail:          [],
  heading:        0,
  displayHeading: 0,
  battery: null, depth: null, temp: null,
  pitch: null, roll: null,
  xspeed: null, yspeed: null, yawRate: null,
  altitude: null,
  thrusterSpeed: null, thrustForce: null,
  status: "Idle",
  connected: false,
  currentWpIdx: 0,
  color: VEHICLE_COLORS[(id - 1) % VEHICLE_COLORS.length],
});

export default function App() {
  const [page, setPage]                     = useState("briefing");
  const [operator]                          = useState("OPERATOR");
  const [time, setTime]                     = useState(0);
  const [ship]                              = useState({ x: 50 });
  const [waypoints, setWaypoints]           = useState([]);
  const [missionStarted, setMissionStarted] = useState(false);
  const [displayStep, setDisplayStep]       = useState(0); // eslint-disable-line no-unused-vars
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [vehicles, setVehicles]             = useState([]);
  const [formationTrail, setFormationTrail] = useState([]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [speedInput, setSpeedInput]         = useState("20");

  const gridRef              = useRef(null);
  const vehiclesRef          = useRef([]);
  const waypointsRef         = useRef([]);
  const selectedVehicleIdRef = useRef(null);
  const wsRef                = useRef(null);
  const missionStartedRef    = useRef(false);
  const lastUpdateRef        = useRef({});

  useEffect(() => { vehiclesRef.current          = vehicles;          }, [vehicles]);
  useEffect(() => { selectedVehicleIdRef.current = selectedVehicleId; }, [selectedVehicleId]);
  useEffect(() => { missionStartedRef.current    = missionStarted;    }, [missionStarted]);
  useEffect(() => { waypointsRef.current         = waypoints;         }, [waypoints]);

  const connectAllVehicles = (vehicleStates, realWaypoints) => {
    const serverIp   = vehicleStates[0].ip;
    const serverPort = vehicleStates[0].port;

    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`ws://${serverIp}:${serverPort}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`✅ Connected to server ws://${serverIp}:${serverPort}`);
      setVehicles(prev => prev.map(v => ({ ...v, connected: true })));
      const vehicleIds = vehicleStates.map(v => v.name);
      const wpArray    = realWaypoints;
      ws.send(JSON.stringify({
        type:      "LAUNCH_ALL",
        vehicles:  vehicleIds,
        waypoints: wpArray,
      }));
      console.log("🚀 LAUNCH_ALL sent:", vehicleIds, "| WPs:", wpArray.length);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "ORIENTATION_DATA") return;

      if (msg.type === "sensor_data" || msg.type === "FULL_VEHICLE_STATE") {
        const dataArray = Array.isArray(msg.data)
          ? msg.data
          : (msg.vehicles || []);

        dataArray.forEach(d => {
          if (!d || !d.vehicle_id) return;

          const now = Date.now();
          const key = d.vehicle_id;
          if (!lastUpdateRef.current[key]) lastUpdateRef.current[key] = 0;
          if (now - lastUpdateRef.current[key] < 100) return;
          lastUpdateRef.current[key] = now;

          const gridX = Math.min(Math.max((d.x_position / 1000) * 100, 1), 99);
          const gridY = Math.min(Math.max((d.depth      / 6000) * 88,  1), 92);

          // Track formation center using first vehicle only
          if (d.vehicle_id === vehiclesRef.current[0]?.name) {
            setFormationTrail(prev => [...prev.slice(-800), { x: gridX, y: gridY }]);
          }

          setVehicles(prev => prev.map(v => {
            if (v.name !== d.vehicle_id) return v;

            const newPos = { x: gridX, y: gridY };

            // ── Smooth heading lerp — alpha=0.15 per frame ──────────
            // heading = heading + alpha * angle_diff(target, heading)
            // Smooth arcs at turns, no snapping, no jitter
            const rawHeading = ((parseFloat(d.heading) || parseFloat(d.yaw) || 0) + 360) % 360;
            const newDisplayHeading = rawHeading;

            return {
              ...v,
              pos:            newPos,
              trail: [],
              heading:        rawHeading,
              displayHeading: newDisplayHeading,
              pitch:         d.pitch         ?? v.pitch,
              roll:          d.roll          ?? v.roll,
              depth:         d.depth         ?? v.depth,
              battery:       d.battery       ?? v.battery,
              temp:          d.temperature   ?? v.temp,
              altitude:      d.altitude      ?? v.altitude,
              xspeed:        d.vx            ?? v.xspeed,
              yspeed:        d.vy            ?? v.yspeed,
              yawRate:       d.yaw_rate_degs ?? v.yawRate,
              thrusterSpeed: d.thruster_fr   ?? v.thrusterSpeed,
              thrustForce:   d.pressure      ?? v.thrustForce,
              current_speed: d.current_speed ?? v.current_speed ?? 0,
              status:
                d.vehicle_status === "DIVING"           ? "Diving"           :
                d.vehicle_status === "ASCENDING"        ? "Ascending"        :
                d.vehicle_status === "MISSION_COMPLETE" ? "Mission Complete" :
                d.vehicle_status === "WAITING"          ? "Idle" : v.status,
              currentWpIdx: d.current_waypoint ?? v.currentWpIdx,
            };
          }));

          if (d.current_waypoint !== undefined) setDisplayStep(d.current_waypoint);
        });
      }
    };

    ws.onclose = () => {
      console.warn("WebSocket closed");
      setVehicles(prev => prev.map(v => ({ ...v, connected: false })));
    };
    ws.onerror = (e) => {
      console.error("WebSocket error", e);
      setVehicles(prev => prev.map(v => ({ ...v, connected: false })));
    };
  };

  useEffect(() => {
    if (!missionStarted) return;
    const timer = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [missionStarted]);

  if (page === "briefing") {
    return <Briefing operator={operator} onLaunch={() => setPage("addVehicle")} />;
  }

  if (page === "addVehicle") {
    return (
      <AddVehicle onEnterDashboard={(addedVehicles, presetWaypoints, realWaypoints) => {
        let startAngle = 0;
        if (presetWaypoints && presetWaypoints.length >= 2) {
          const nx = presetWaypoints[1].x - presetWaypoints[0].x;
          const ny = presetWaypoints[1].y - presetWaypoints[0].y;
          startAngle = Math.atan2(ny, nx);
        }

        const offsets = getFormationOffsets(addedVehicles.length);
        const startX  = presetWaypoints?.[0]?.x ?? 50;
        const startY  = presetWaypoints?.[0]?.y ?? 33;

        const states = addedVehicles.map((av, i) => {
          const s   = createVehicleState(i + 1, av.name, av.ip, av.port);
          const off = offsets[i] || { dx: 0, dy: 0 };
          const { rdx, rdy } = rotateOffset(off.dx, off.dy, startAngle);
          s.pos     = {
            x: Math.max(1, Math.min(99, startX + rdx)),
            y: Math.max(1, Math.min(92, startY + rdy)),
          };
          s.prevPos = { ...s.pos };
          return s;
        });

        setVehicles(states);
        setSelectedVehicleId(states[0].id);

        if (presetWaypoints && presetWaypoints.length > 0) {
          setWaypoints(presetWaypoints);
          waypointsRef.current = presetWaypoints;
        }

        connectAllVehicles(states, realWaypoints);
        setMissionStarted(false);  // ← vehicles wait, START button stays enabled
        setPage("dashboard");
      }} />
    );
  }

  const handleStartMission = () => {
    if (waypoints.length === 0 || vehicles.length === 0) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Single START_MISSION message — sets speed AND starts movement
      ws.send(JSON.stringify({
        type:  "START_MISSION",
        speed: parseFloat(speedInput) || 20,
      }));
    }
    setDisplayStep(0);
    setTime(0);
    setMissionStarted(true);
  };

  const handleReset = () => {
    setMissionStarted(false);
    setTime(0);
    setDisplayStep(0);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "RESET" }));
    }

    const offsets = getFormationOffsets(vehicles.length);
    let startAngle = 0;
    if (waypoints.length >= 2) {
      const nx = waypoints[1].x - waypoints[0].x;
      const ny = waypoints[1].y - waypoints[0].y;
      startAngle = Math.atan2(ny, nx);
    }
    const startX = waypoints[0]?.x ?? 50;
    const startY = waypoints[0]?.y ?? 33;

    setFormationTrail([]);
    setVehicles(prev => prev.map((v, idx) => {
      const off = offsets[idx] || { dx: 0, dy: 0 };
      const { rdx, rdy } = rotateOffset(off.dx, off.dy, startAngle);
      const resetPos = {
        x: Math.max(1, Math.min(99, startX + rdx)),
        y: Math.max(1, Math.min(92, startY + rdy)),
      };
      return {
        ...v,
        pos: resetPos, prevPos: resetPos,
        trail: [], heading: 0, displayHeading: 0, currentWpIdx: 0,
        battery: null, depth: null, temp: null, pitch: null, roll: null,
        xspeed: null, yspeed: null, yawRate: null, altitude: null,
        thrusterSpeed: null, thrustForce: null, status: "Idle",
      };
    }));
  };

  const handleSpeedChange = (e) => {
    const val = e.target.value;
    setSpeedInput(val);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && val) {
      ws.send(JSON.stringify({ type: "SET_SPEED", speed: parseFloat(val) }));
    }
  };

  const formatTime = (s) => {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toRealX = (x) => Math.round((x / 100) * 1000);
  const toRealY = (y) => Math.round((y / 88)  * 6000);

  const statusConfig = {
    "Idle":             { color: "#c0c0c0", icon: "⏹️" },
    "Diving":           { color: "#4fc3f7", icon: "⬇️" },
    "Hovering":         { color: "#ffb74d", icon: "⏸️" },
    "Ascending":        { color: "#81c784", icon: "⬆️" },
    "Emergency":        { color: "#ff4444", icon: "🚨" },
    "Mission Complete": { color: "#ffd700", icon: "✅" },
  };

  const renderRow = (label, val, color, unit = "") => {
    const isNull  = val === null || val === undefined;
    const display = isNull ? "—" : (typeof val === "number" ? val.toFixed(2) : val);
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "4px 6px", marginBottom: "3px", background: "#0a0f1e",
        borderRadius: "4px", borderLeft: `2px solid ${color}` }}>
        <span style={{ color: "#a0a0a0", fontSize: "10px", flexShrink: 0 }}>— {label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ color, fontSize: "10px", fontWeight: "bold",
            minWidth: "52px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{display}</span>
          {unit && <span style={{ color: "#606080", fontSize: "9px", width: "22px" }}>{unit}</span>}
        </span>
      </div>
    );
  };

  const VehicleCard = React.memo(({ v }) => {
    const sc = statusConfig[v.status] || statusConfig["Idle"];
    return (
      <div style={{ marginBottom: "16px", background: "#0a0f1e", border: `1px solid ${v.color}`,
        borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(to right, ${v.color}22, transparent)`,
          padding: "8px 14px", borderBottom: `1px solid ${v.color}44`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%",
              background: v.connected ? "#81c784" : v.color, boxShadow: `0 0 6px ${v.color}` }} />
            <span style={{ color: v.color, fontSize: "12px", fontWeight: "bold",
              letterSpacing: "2px" }}>{v.name}</span>
            <span style={{ color: v.connected ? "#81c784" : "#606080", fontSize: "9px" }}>
              {v.connected ? "🟢" : "🔴"} {v.ip}:{v.port}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: sc.color, fontSize: "10px" }}>{sc.icon} {v.status.toUpperCase()}</span>
            <span style={{ padding: "3px 8px", background: v.color + "22",
              border: `1px solid ${v.color}`, borderRadius: "4px",
              color: v.color, fontSize: "9px",
              fontFamily: "'Times New Roman', Times, serif" }}>
              ✔ ACTIVE
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "10px" }}>
          <div>
            <div style={{ color: v.color, fontSize: "9px", letterSpacing: "2px",
              marginBottom: "5px", borderLeft: `2px solid ${v.color}`, paddingLeft: "5px" }}>NAVIGATION</div>
            {renderRow("Pitch",    v.pitch,   v.color, "°")}
            {renderRow("Roll",     v.roll,    v.color, "°")}
            {renderRow("Heading",  v.heading, v.color, "°")}
            {renderRow("X Speed",  v.xspeed,  v.color, "m/s")}
            {renderRow("Yaw Rate", v.yawRate, v.color, "°/s")}
          </div>
          <div>
            <div style={{ color: "#81c784", fontSize: "9px", letterSpacing: "2px",
              marginBottom: "5px", borderLeft: "2px solid #81c784", paddingLeft: "5px" }}>SYSTEM</div>
            {renderRow("Depth",    v.depth,       "#81c784", "m")}
            {renderRow("Alt",      v.altitude,    "#81c784", "m")}
            {renderRow("Battery",  v.battery,     "#f06292", "%")}
            {renderRow("Temp",     v.temp,        "#f06292", "°C")}
            {renderRow("Pressure", v.thrustForce, "#ce93d8", "bar")}
          </div>
        </div>
      </div>
    );
  });

  const xLines = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const yLines = [0, 1000, 2000, 3000, 4000, 5000, 6000];
  const shipX  = toRealX(ship.x);

  return (
    <div style={{ background: "#0a0f1e", minHeight: "100vh", color: "#e8e8e8",
      fontFamily: "'Times New Roman', Times, serif", padding: "16px" }}>

      <div style={{ textAlign: "center", borderBottom: "2px solid #c0c0c0",
        paddingBottom: "12px", marginBottom: "16px", position: "relative" }}>
        <div style={{ position: "absolute", top: "0px", left: "0px", background: "#0d1426",
          border: "1px solid #4488aa", borderRadius: "8px", padding: "6px 14px",
          display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={require("./logo niot.png")} alt="NIOT Logo" style={{ height: "50px" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#4488aa", fontSize: "11px", fontWeight: "bold", letterSpacing: "2px" }}>NIOT</div>
            <div style={{ color: "#446688", fontSize: "8px", letterSpacing: "1px" }}>MIN. OF EARTH SCIENCES</div>
          </div>
        </div>
        <h1 style={{ color: "#ffffff", fontSize: "24px", margin: 0, letterSpacing: "4px" }}>
          🌊 UNDERWATER VEHICLE — MISSION CONTROL DASHBOARD
        </h1>
        <p style={{ color: "#707090", margin: "4px 0 0", fontSize: "13px" }}>
          Mission Time: {formatTime(time)}
        </p>
        <div style={{ position: "absolute", top: "0px", right: "0px",
          display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#FF9933", fontSize: "9px", letterSpacing: "1px", fontWeight: "bold" }}>INDIA</div>
            <div style={{ color: "#138808", fontSize: "8px", letterSpacing: "1px" }}>GOVT. OF INDIA</div>
          </div>
          <img src={require("./indianflag.png")} alt="India Flag"
            style={{ height: "60px", borderRadius: "3px", border: "1px solid #444" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", height: "calc(100vh - 160px)" }}>

        <div style={{
          width: panelCollapsed ? "38px" : "28%",
          minWidth: panelCollapsed ? "38px" : "240px",
          transition: "width 0.3s ease",
          background: "#0d1426", border: "1px solid #c0c0c0",
          borderRadius: "8px", overflowY: panelCollapsed ? "hidden" : "auto",
          overflowX: "hidden", position: "relative", flexShrink: 0,
        }}>
          <button onClick={() => setPanelCollapsed(p => !p)}
            style={{ position: "absolute", top: "8px", right: "6px", zIndex: 10,
              width: "24px", height: "24px", background: "#1a2a3a",
              border: "1px solid #4488aa", borderRadius: "4px", color: "#4488aa",
              fontSize: "12px", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", padding: 0 }}>
            {panelCollapsed ? "▶" : "◀"}
          </button>
          <div style={{ padding: "16px", opacity: panelCollapsed ? 0 : 1,
            transition: "opacity 0.2s", pointerEvents: panelCollapsed ? "none" : "auto",
            minWidth: "220px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "1px solid #c0c0c0", paddingBottom: "8px", marginBottom: "16px",
              paddingRight: "28px" }}>
              <h2 style={{ color: "#ffffff", fontSize: "14px", letterSpacing: "3px", margin: 0 }}>
                📊 PARAMETERS
              </h2>
            </div>
            {vehicles.map(v => <VehicleCard key={v.id} v={v} />)}
            {waypoints.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ color: "#ffd700", fontSize: "11px", letterSpacing: "3px",
                  marginBottom: "8px", borderLeft: "3px solid #ffd700", paddingLeft: "8px" }}>
                  WAYPOINTS ({waypoints.length})
                </div>
                {waypoints.map((wp, i) => {
                  const activeV = vehicles.find(v => v.id === selectedVehicleId);
                  const curIdx  = activeV?.currentWpIdx || 0;
                  const done    = i < curIdx;
                  const current = i === curIdx && missionStarted;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "6px 10px", marginBottom: "4px",
                      background: "#111827", borderRadius: "6px",
                      borderLeft: `2px solid ${done?"#81c784":current?"#4fc3f7":"#ffd700"}` }}>
                      <span style={{ color: done?"#81c784":current?"#4fc3f7":"#ffd700", fontSize: "11px" }}>
                        {done ? "✅" : current ? "🔵" : "▷"} WP {wp.label}
                      </span>
                      <span style={{ color: "#a0a0a0", fontSize: "10px" }}>
                        X={toRealX(wp.x)}m Y={toRealY(wp.y)}m
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, background: "#0d1426", border: "1px solid #c0c0c0",
          borderRadius: "8px", padding: "16px", display: "flex",
          flexDirection: "column", overflow: "hidden" }}>
          <h2 style={{ color: "#ffffff", fontSize: "14px", letterSpacing: "3px",
            borderBottom: "1px solid #c0c0c0", paddingBottom: "8px", marginBottom: "8px" }}>
            🗺️ VEHICLE POSITION GRID
          </h2>

          <div style={{ display: "flex", gap: "8px", marginBottom: "8px",
            alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={handleStartMission}
              disabled={waypoints.length === 0 || missionStarted}
              style={{ padding: "8px 16px",
                background: waypoints.length === 0 || missionStarted ? "#1a2a1a" : "#1a4a1a",
                border: `1px solid ${waypoints.length === 0 || missionStarted ? "#444" : "#81c784"}`,
                borderRadius: "6px",
                color: waypoints.length === 0 || missionStarted ? "#444" : "#81c784",
                fontSize: "11px", letterSpacing: "2px",
                cursor: waypoints.length === 0 || missionStarted ? "not-allowed" : "pointer",
                fontFamily: "'Times New Roman', Times, serif" }}>
              ▶ START MISSION
            </button>
            <button onClick={handleReset}
              style={{ padding: "8px 16px", background: "#2a1a1a",
                border: "1px solid #ff4444", borderRadius: "6px", color: "#ff4444",
                fontSize: "11px", letterSpacing: "2px", cursor: "pointer",
                fontFamily: "'Times New Roman', Times, serif" }}>
              ↺ RESET MISSION
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "6px",
              background: "#111827", border: "1px solid #ffd700",
              borderRadius: "6px", padding: "4px 10px" }}>
              <span style={{ color: "#ffd700", fontSize: "10px" }}>⚡ SPEED</span>
              <input type="number" min="1" max="500" value={speedInput}
                onChange={handleSpeedChange}
                style={{ width: "50px", background: "transparent", border: "none",
                  color: "#ffd700", fontSize: "12px", fontWeight: "bold",
                  outline: "none", textAlign: "center",
                  fontFamily: "'Times New Roman', Times, serif" }} />
              <span style={{ color: "#ffd700", fontSize: "10px" }}>m/s</span>
            </div>
            <div style={{ color: missionStarted ? "#81c784" : "#ffd700", fontSize: "10px" }}>
              {missionStarted
                ? `🔒 ${vehicles.length} VEHICLES RUNNING IN FORMATION`
                : `✅ ${waypoints.length} waypoints — ${vehicles.length} vehicles ready`}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "6px", fontSize: "10px", flexWrap: "wrap" }}>
            <span>🚢 <span style={{ color: "#4fc3f7" }}>Ship</span></span>
            {vehicles.map(v => (
              <span key={v.id} style={{ color: v.color }}>
                ● {v.name}
              </span>
            ))}
            <span style={{ color: "#ffd700" }}>• Waypoint</span>
          </div>

          <div style={{ textAlign: "center", color: "#a0a0a0", fontSize: "11px",
            letterSpacing: "2px", marginBottom: "4px" }}>← HORIZONTAL POSITION (m) →</div>

          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", marginRight: "6px" }}>
              <span style={{ color: "#a0a0a0", fontSize: "11px", letterSpacing: "2px",
                writingMode: "vertical-rl", transform: "rotate(180deg)" }}>↑ DEPTH (m) ↓</span>
            </div>

            <div ref={gridRef} style={{
              flex: 1, position: "relative",
              background: "linear-gradient(to bottom, #001a33 0%, #001020 40%, #000810 70%, #000508 100%)",
              borderRadius: "6px",
              border: `2px solid ${missionStarted ? "#c0c0c0" : "#ffd700"}`,
              overflow: "hidden", cursor: "default",
            }}>
              {xLines.map(x => (
                <div key={x} style={{ position: "absolute", left: `${x}%`,
                  top: 0, bottom: 0, borderLeft: "1px solid rgba(192,192,192,0.2)", zIndex: 1 }}>
                  <span style={{ position: "absolute", bottom: "4px", left: "2px",
                    color: "#c0c0c0", fontSize: "9px", opacity: 0.7 }}>{Math.round(x * 10)}m</span>
                </div>
              ))}
              {yLines.map(d => (
                <div key={d} style={{ position: "absolute", top: `${(d / 6000) * 93}%`,
                  left: 0, right: 0, borderTop: "1px solid rgba(192,192,192,0.2)", zIndex: 1 }}>
                  <span style={{ position: "absolute", left: "4px", top: "2px",
                    color: "#c0c0c0", fontSize: "9px", opacity: 0.7 }}>{d}m</span>
                </div>
              ))}

              <div style={{ position:"absolute", right:"8px", top:"2%",  color:"#ffffff", fontSize:"10px", opacity:0.8 }}>☀️ Sunlight Zone</div>
              <div style={{ position:"absolute", right:"8px", top:"18%", color:"#c0c0c0", fontSize:"10px", opacity:0.8 }}>🌑 Twilight Zone</div>
              <div style={{ position:"absolute", right:"8px", top:"40%", color:"#909090", fontSize:"10px", opacity:0.8 }}>🌊 Midnight Zone</div>
              <div style={{ position:"absolute", right:"8px", top:"68%", color:"#606060", fontSize:"10px", opacity:0.8 }}>⬛ Abyssal Zone</div>

              <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", zIndex:2, pointerEvents:"none" }}>

                {waypoints.map((wp, i) => {
                  if (i === 0) return null;
                  const prev    = waypoints[i - 1];
                  const activeV = vehicles.find(v => v.id === selectedVehicleId);
                  const curIdx  = activeV?.currentWpIdx || 0;
                  const isDone  = i < curIdx && missionStarted;
                  const isAct   = i === curIdx && missionStarted;
                  return (
                    <line key={"line-" + i}
                      x1={prev.x} y1={prev.y} x2={wp.x} y2={wp.y}
                      stroke={isDone ? "#81c784" : isAct ? "#4fc3f7" : "#ffd700"}
                      strokeWidth="0.5"
                      opacity={isDone ? 0.7 : isAct ? 1.0 : 0.5}
                      strokeDasharray={isDone ? "0" : "2,1"}
                      vectorEffect="non-scaling-stroke" />
                  );
                })}

                {missionStarted && vehicles.length > 1 && (() => {
                  const positions = vehicles.map(v => v.pos);
                  if (vehicles.length === 2) {
                    return (
                      <line x1={positions[0].x} y1={positions[0].y}
                        x2={positions[1].x} y2={positions[1].y}
                        stroke="#ffffff" strokeWidth="0.4" opacity="0.35"
                        strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                    );
                  }
                  if (vehicles.length === 3) {
                    return (
                      <polygon points={positions.map(p => `${p.x},${p.y}`).join(" ")}
                        fill="rgba(255,255,255,0.03)" stroke="#ffffff" strokeWidth="0.4"
                        opacity="0.35" strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                    );
                  }
                  return positions.map((p, i) => {
                    const next = positions[(i + 1) % positions.length];
                    return (
                      <line key={"fl-" + i}
                        x1={p.x} y1={p.y} x2={next.x} y2={next.y}
                        stroke="#ffffff" strokeWidth="0.4" opacity="0.35"
                        strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                    );
                  });
                })()}

                {/* Single glowing trail for whole formation */}
                {formationTrail.length > 1 && (
                  <g>
                    {formationTrail.map((pt, i) => {
                      if (i === 0) return null;
                      const prev  = formationTrail[i - 1];
                      const frac  = i / formationTrail.length;
                      return (
                        <line key={i}
                          x1={prev.x} y1={prev.y}
                          x2={pt.x}   y2={pt.y}
                          stroke="#4fc3f7"
                          strokeWidth={0.2 + frac * 2.0}
                          opacity={frac * 0.9}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke" />
                      );
                    })}
                  </g>
                )}

                {waypoints.map((wp, i) => {
                  const activeV = vehicles.find(v => v.id === selectedVehicleId);
                  const curIdx  = activeV?.currentWpIdx || 0;
                  const done    = i < curIdx && missionStarted;
                  return (
                    <g key={"wp-" + i}>
                      <circle cx={wp.x} cy={wp.y} r="1.2"
                        fill={done ? "#81c784" : "#ffd700"} vectorEffect="non-scaling-stroke" />
                      <text x={wp.x} y={wp.y + 0.8} textAnchor="middle"
                        fill="#ffffff" fontSize="2.5" fontWeight="bold" fontFamily="Times New Roman">
                        {wp.label}
                      </text>
                      <text x={wp.x + 2.5} y={wp.y - 3}
                        fill="#ffd700" fontSize="2.2" fontFamily="Times New Roman" opacity="0.9">
                        WAYPOINT {wp.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

             

              <div style={{ position:"absolute", left:`${ship.x}%`, top:"1%",
                transform:"translateX(-50%)", textAlign:"center", zIndex:3 }}>
                <div style={{ fontSize:"18px" }}>🚢</div>
                <div style={{ color:"#4fc3f7", fontSize:"8px", whiteSpace:"nowrap" }}>SHIP X={shipX}m</div>
              </div>

              {vehicles.map(v => {
                const displayHdg = ((v.heading % 360) + 360) % 360;
                const hdg        = ((v.heading % 360) + 360) % 360;
                const isSelected = v.id === selectedVehicleId;
                const dirLabel   = (() => {
                  if (hdg >= 337.5 || hdg < 22.5)  return "E";
                  if (hdg < 67.5)  return "SE";
                  if (hdg < 112.5) return "S";
                  if (hdg < 157.5) return "SW";
                  if (hdg < 202.5) return "W";
                  if (hdg < 247.5) return "NW";
                  if (hdg < 292.5) return "N";
                  return "NE";
                })();
                return (
                  <div key={v.id} style={{
                    position: "absolute", left: `${v.pos.x}%`, top: `${v.pos.y}%`,
width: 0, height: 0, zIndex: isSelected ? 5 : 4,
                  }}>
                    {isSelected && (
                      <div style={{
                        position: "absolute", left: "-30px", top: "-20px",
                        width: "60px", height: "40px",
                        border: `1px solid ${v.color}`, borderRadius: "50%",
                        opacity: 0.6, pointerEvents: "none",
                      }} />
                    )}
                    <div style={{
                      position: "absolute", left: "-24px", top: "-14px",
                      transform: `rotate(${displayHdg}deg)`,
                    transformOrigin: "24px 14px",
                    transition: "none", lineHeight: 0, cursor: "pointer",
                    }} onClick={() => setSelectedVehicleId(v.id)}>
                      <svg width="48" height="28" viewBox="0 0 48 28" style={{ display: "block" }}>
                        <ellipse cx="22" cy="14" rx="17" ry="6"
                          fill={v.color} stroke="#ffffff" strokeWidth="0.8" opacity="0.95"/>
                        <polygon points="46,14 33,7 33,21"
                          fill="#ff0000" stroke="#ff6666" strokeWidth="0.5" opacity="1.0"/>
                        <ellipse cx="6" cy="14" rx="4" ry="6"
                          fill={v.color} stroke="#ffffff" strokeWidth="0.6" opacity="0.9"/>
                        <polygon points="18,8 22,2 26,8"
                          fill={v.color} stroke="#ffffff" strokeWidth="0.5" opacity="0.9"/>
                        <polygon points="18,20 22,26 26,20"
                          fill={v.color} stroke="#ffffff" strokeWidth="0.5" opacity="0.9"/>
                        <polygon points="8,8 2,4 5,14"
                          fill={v.color} stroke="#ffffff" strokeWidth="0.5" opacity="0.8"/>
                        <polygon points="8,20 2,24 5,14"
                          fill={v.color} stroke="#ffffff" strokeWidth="0.5" opacity="0.8"/>
                        <circle cx="28" cy="14" r="2.5"
                          fill="#001428" stroke="#ffffff" strokeWidth="0.5"/>
                        <circle cx="28" cy="14" r="1.3" fill="#4fc3f7" opacity="1.0"/>
                      </svg>
                    </div>
                    <div style={{
                      position: "absolute", top: "18px", left: "50%",
                      transform: "translateX(-50%)", textAlign: "center",
                      pointerEvents: "none", whiteSpace: "nowrap",
                    }}>
                      <div style={{ color: v.color, fontSize: "7px", fontWeight: "bold" }}>{v.name}</div>
                      <div style={{ color: "#ffffff", fontSize: "6px" }}>{Math.round(hdg)}° {dirLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px",
          overflowY: "auto", flexShrink: 0 }}>
          {vehicles.map(v => <VehicleColumn key={v.id} v={v} />)}
        </div>
      </div>

      <div style={{ marginTop: "12px", background: "#0d1426", border: "1px solid #4488aa",
        borderRadius: "8px", padding: "10px 16px", display: "flex", gap: "16px",
        flexWrap: "wrap", alignItems: "center" }}>
        {vehicles.map(v => {
          const sc = statusConfig[v.status] || statusConfig["Idle"];
          return (
            <span key={v.id} style={{ color: sc.color, fontSize: "11px", letterSpacing: "1px" }}>
              {sc.icon} {v.name}: {v.status.toUpperCase()} | HDG: {Math.round(v.heading || 0)}° | SPD: {speedInput} m/s
            </span>
          );
        })}
        <span style={{ color: "#707090", fontSize: "11px", marginLeft: "auto" }}>
          ⏱ {formatTime(time)} | WP: {waypoints.length > 0
            ? `${Math.min((vehicles[0]?.currentWpIdx || 0), waypoints.length)}/${waypoints.length}`
            : "0/0"} | Vehicles: {vehicles.length}
        </span>
      </div>
    </div>
  );
}