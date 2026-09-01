import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Code2, Users, Flame, Plus, LogIn, Copy, Check, Search, Bell,
  Settings, LayoutDashboard, FolderOpen, BookOpen, ChevronRight,
  Sparkles, Clock, Globe, X, ArrowRight
} from "lucide-react";

const COLORS = {
  ink: "#14162B",
  ink2: "#22254A",
  cloud: "#F8F8FC",
  cloudDim: "#EFEFF7",
  violet: "#6C5CE7",
  violetDeep: "#5240C4",
  volt: "#C6FF3D",
  coral: "#FF6B5E",
  slate: "#8A8FA3",
  white: "#FFFFFF",
};

function genRoomId() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

const recentRooms = [
  { id: "48213709", name: "Binary search revisited", lang: "Python", people: 3, active: "2m ago" },
  { id: "70562841", name: "Auth middleware fix", lang: "TypeScript", people: 2, active: "38m ago" },
  { id: "39481256", name: "Interview: reverse LL", lang: "JavaScript", people: 4, active: "1h ago" },
  { id: "82093174", name: "Goroutine pool demo", lang: "Go", people: 2, active: "yesterday" },
];

const activity = [
  { seed: "Sam", text: "Sam joined bold-falcon-17", time: "2m ago" },
  { seed: "You", text: "You created a new room", time: "1h ago" },
  { seed: "Priya", text: "keen-lynx-08 hit 4 participants", time: "3h ago" },
  { seed: "You", text: "Reached a 12-day streak", time: "yesterday" },
  { seed: "Sam", text: "Sam left a comment in wry-heron-63", time: "yesterday" },
];

function Avatar({ seed, size = 28 }) {
  const hue = (seed.charCodeAt(0) * 37) % 360;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "999px",
        background: `hsl(${hue}, 70%, 60%)`,
        border: "2px solid " + COLORS.white,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Space Grotesk, sans-serif", fontWeight: 700,
        fontSize: size * 0.4, color: "#fff", marginLeft: -8, flexShrink: 0,
      }}
    >
      {seed[0].toUpperCase()}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, badge }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", borderRadius: 12, cursor: "pointer",
        color: active ? COLORS.ink : "rgba(255,255,255,0.65)",
        background: active ? COLORS.volt : "transparent",
        fontWeight: active ? 700 : 500,
        transition: "background 0.15s, color 0.15s",
      }}
    >
      <Icon size={18} strokeWidth={2.2} />
      <span style={{ fontSize: 14, flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 800, background: active ? COLORS.ink : COLORS.coral,
          color: active ? COLORS.volt : "#fff", borderRadius: 999, padding: "2px 7px",
        }}>{badge}</span>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{
      background: COLORS.white, borderRadius: 18, padding: "18px 20px",
      border: `1px solid ${COLORS.cloudDim}`, flex: 1, minWidth: 150,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: accent + "22",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>
        <Icon size={17} color={accent} strokeWidth={2.4} />
      </div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.ink, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.slate, marginTop: 6, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: accent, marginTop: 4, fontWeight: 700 }}>{sub}</div>}
    </div>
  );
}

function RoomIdChip({ id, copied, onCopy, large }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      background: COLORS.ink, borderRadius: 12,
      padding: large ? "12px 16px" : "8px 12px",
      fontFamily: "JetBrains Mono, monospace",
    }}>
      <span style={{ color: COLORS.slate, fontSize: large ? 13 : 11 }}>$</span>
      <span style={{ color: COLORS.volt, fontSize: large ? 16 : 13, fontWeight: 600 }}>{id}</span>
      <span
        style={{
          display: "inline-block", width: large ? 8 : 6, height: large ? 16 : 13,
          background: COLORS.volt, animation: "blink 1s step-end infinite",
        }}
      />
      {onCopy && (
        <button
          onClick={onCopy}
          style={{
            marginLeft: 4, background: "none", border: "none", cursor: "pointer",
            color: copied ? COLORS.volt : COLORS.slate, display: "flex", alignItems: "center",
          }}
          aria-label="Copy room id"
        >
          {copied ? <Check size={large ? 18 : 15} /> : <Copy size={large ? 18 : 15} />}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCreate = () => {
    setCreating(true);
    setTimeout(() => {
      const id = genRoomId();
      setRoomId(id);
      setCreating(false);
      setToast({ type: "ok", msg: "Room created — ready to share." });
    }, 550);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setToast({ type: "ok", msg: "Room ID copied." });
    setTimeout(() => setCopied(false), 1500);
  };

  const handleJoin = () => {
    const v = joinValue.trim();
    const pattern = /^\d{8}$/;
    if (!v) {
      setJoinError("Enter a room ID to continue.");
      return;
    }
    if (!pattern.test(v)) {
      setJoinError("Room ID should be 8 digits, like 48213709.");
      return;
    }
    setJoinError("");
    setToast({ type: "ok", msg: `Joining ${v}…` });
    navigate(`/room/${v}`);
  };

  return (
    <div style={{
      fontFamily: "Inter, sans-serif", background: COLORS.cloud, minHeight: "100vh",
      display: "flex", color: COLORS.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes popin { from { opacity:0; transform: translateY(6px) scale(0.98);} to {opacity:1; transform: translateY(0) scale(1);} }
        * { box-sizing: border-box; }
        input:focus { outline: none; }
        .hoverlift { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .hoverlift:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(20,22,43,0.08); }
        .create-join-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: stretch; }
        @media (max-width: 720px) {
          .create-join-row { grid-template-columns: 1fr; }
        }
      `}</style>
      

      {/* Sidebar */}
      <aside style={{
        width: 240, background: COLORS.ink, padding: "22px 16px",
        display: "flex", flexDirection: "column", gap: 4, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 24px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: COLORS.volt,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Code2 size={18} color={COLORS.ink} strokeWidth={2.6} />
          </div>
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
            pairhouse
          </span>
        </div>

        <NavItem icon={LayoutDashboard} label="Dashboard" active />
        <NavItem icon={FolderOpen} label="My rooms" badge="4" />
        <NavItem icon={BookOpen} label="Templates" />
        <NavItem icon={Users} label="Team" />
        <NavItem icon={Settings} label="Settings" />

        <div style={{ flex: 1 }} />

        <div style={{
          background: COLORS.ink2, borderRadius: 14, padding: 16,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Flame size={18} color={COLORS.coral} fill={COLORS.coral} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "Space Grotesk, sans-serif" }}>
              12-day streak
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            Pair once today to keep it alive.
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div style={{ width: "70%", height: "100%", background: COLORS.volt, borderRadius: 999 }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "26px 34px 60px", maxWidth: 1180 }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: COLORS.white, border: `1px solid ${COLORS.cloudDim}`,
            borderRadius: 12, padding: "9px 14px", maxWidth: 380,
          }}>
            <Search size={16} color={COLORS.slate} />
            <input
              placeholder="Search rooms, people, snippets…"
              style={{ border: "none", background: "transparent", fontSize: 13.5, width: "100%", color: COLORS.ink }}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: COLORS.white,
            border: `1px solid ${COLORS.cloudDim}`, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", position: "relative",
          }}>
            <Bell size={17} color={COLORS.ink} />
            <span style={{
              position: "absolute", top: 8, right: 9, width: 6, height: 6,
              background: COLORS.coral, borderRadius: "50%",
            }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: COLORS.violet,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif",
            }}>M</div>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.violet, fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
            <Sparkles size={14} />
            WELCOME BACK
          </div>
          <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 30, fontWeight: 700, margin: 0 }}>
            Ready to pair up, Maya?
          </h1>
          <p style={{ color: COLORS.slate, fontSize: 14.5, marginTop: 6 }}>
            Spin up a room in one click, or jump into one with an ID.
          </p>
        </div>

        {/* Create / Join */}
        <div className="create-join-row" style={{ marginBottom: 26 }}>
          <div className="hoverlift" style={{
            background: COLORS.ink, borderRadius: 20, padding: 24,
            position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <div style={{
              position: "absolute", top: -40, right: -40, width: 140, height: 140,
              borderRadius: "50%", background: "radial-gradient(circle, rgba(198,255,61,0.18), transparent 70%)",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: COLORS.volt,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Plus size={18} color={COLORS.ink} strokeWidth={2.6} />
              </div>
              <span style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 17 }}>
                Create a room
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 18, maxWidth: 300 }}>
              We'll generate a memorable ID instantly. Share it and start coding together.
            </p>

            {roomId ? (
              <div style={{ animation: "popin 0.2s ease", display: "flex", flexDirection: "column", gap: 12 }}>
                <RoomIdChip id={roomId} copied={copied} onCopy={handleCopy} large />
                <button
                  onClick={() => navigate(`/room/${roomId}`)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: COLORS.volt, color: COLORS.ink, border: "none", borderRadius: 12,
                    padding: "11px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                  }}
                >
                  Enter room <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  background: COLORS.volt, color: COLORS.ink, border: "none", borderRadius: 12,
                  padding: "11px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {creating ? "Generating…" : "Generate room ID"}
                {!creating && <ArrowRight size={15} />}
              </button>
            )}
          </div>

          <div className="hoverlift" style={{
            background: COLORS.white, border: `1px solid ${COLORS.cloudDim}`,
            borderRadius: 20, padding: 24, display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: COLORS.violet + "1a",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <LogIn size={17} color={COLORS.violet} strokeWidth={2.4} />
              </div>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 17 }}>
                Join a room
              </span>
            </div>
            <p style={{ color: COLORS.slate, fontSize: 13, marginBottom: 18, maxWidth: 300 }}>
              Got an ID from a teammate? Drop it in below to jump straight in.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={joinValue}
                onChange={(e) => { setJoinValue(e.target.value); setJoinError(""); }}
                placeholder="e.g. 48213709"
                style={{
                  flex: 1, border: `1.5px solid ${joinError ? COLORS.coral : COLORS.cloudDim}`,
                  borderRadius: 12, padding: "11px 14px", fontFamily: "JetBrains Mono, monospace",
                  fontSize: 13.5, color: COLORS.ink, background: COLORS.cloud,
                }}
              />
              <button
                onClick={handleJoin}
                style={{
                  background: COLORS.violet, color: "#fff", border: "none", borderRadius: 12,
                  padding: "0 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                Join <ChevronRight size={15} />
              </button>
            </div>
            {joinError && (
              <div style={{ color: COLORS.coral, fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                {joinError}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 30, flexWrap: "wrap" }}>
          <StatCard icon={FolderOpen} label="Rooms hosted" value="27" accent={COLORS.violet} />
          <StatCard icon={Clock} label="Hours paired" value="64.5" accent={COLORS.coral} />
          <StatCard icon={Flame} label="Coding streak" value="12 days" accent={COLORS.coral} sub="Best: 21 days" />
          <StatCard icon={Globe} label="Languages used" value="6" accent={COLORS.violet} />
        </div>

        {/* Recent rooms */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
              Recent rooms
            </h2>
            <span style={{ color: COLORS.violet, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              View all <ChevronRight size={14} />
            </span>
          </div>
          <div style={{ background: COLORS.white, borderRadius: 18, border: `1px solid ${COLORS.cloudDim}`, overflow: "hidden" }}>
            {recentRooms.map((r, i) => (
              <div
                key={r.id}
                className="hoverlift"
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                  borderBottom: i < recentRooms.length - 1 ? `1px solid ${COLORS.cloudDim}` : "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                </div>
                <RoomIdChip id={r.id} />
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center" }}>
                  {Array.from({ length: r.people }).slice(0, 3).map((_, idx) => (
                    <Avatar key={idx} seed={r.id + idx} size={26} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: COLORS.slate, width: 80, textAlign: "right" }}>{r.active}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div>
          <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>
            Recent activity
          </h2>
          <div style={{ background: COLORS.white, borderRadius: 18, border: `1px solid ${COLORS.cloudDim}`, padding: "6px 20px" }}>
            {activity.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 0",
                  borderBottom: i < activity.length - 1 ? `1px solid ${COLORS.cloudDim}` : "none",
                }}
              >
                <Avatar seed={a.seed} size={28} />
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{a.text}</div>
                <div style={{ fontSize: 12, color: COLORS.slate, flexShrink: 0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: COLORS.ink, color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 12px 30px rgba(20,22,43,0.25)", animation: "popin 0.2s ease",
        }}>
          <Check size={15} color={COLORS.volt} />
          {toast.msg}
          <X size={14} style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}