import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft, ChevronDown, Play, Send, Settings, Loader2,
  Terminal, MessageSquare, Copy, Check, Circle
} from "lucide-react";

const COLORS = {
  ink: "#14162B",
  ink2: "#22254A",
  cloud: "#F8F8FC",
  cloudDim: "#EFEFF7",
  violet: "#6C5CE7",
  volt: "#C6FF3D",
  coral: "#FF6B5E",
  slate: "#8A8FA3",
  white: "#FFFFFF",
};

const LANGUAGES = [
  { name: "Python", monacoId: "python", runnerId: "python", color: "#3776AB", starter: `def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("world")` },
  { name: "JavaScript", monacoId: "javascript", runnerId: "javascript", color: "#D7B500", starter: `function greet(name) {\n  console.log(\`Hello, \${name}!\`);\n}\n\ngreet("world");` },
  { name: "TypeScript", monacoId: "typescript", runnerId: null, color: "#3178C6", starter: `function greet(name: string): void {\n  console.log(\`Hello, \${name}!\`);\n}\n\ngreet("world");` },
  { name: "Go", monacoId: "go", runnerId: null, color: "#00ADD8", starter: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n}` },
  { name: "C++", monacoId: "cpp", runnerId: "cpp", color: "#00599C", starter: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, world!" << endl;\n    return 0;\n}` },
];

const initialMessages = [];

function Avatar({ seed, size = 26 }) {
  const hue = (seed.charCodeAt(0) * 37) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "999px",
      background: `hsl(${hue}, 70%, 60%)`, border: "2px solid " + COLORS.white,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Space Grotesk, sans-serif", fontWeight: 700,
      fontSize: size * 0.42, color: "#fff", flexShrink: 0,
    }}>
      {seed[0].toUpperCase()}
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [langIdx, setLangIdx] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [code, setCode] = useState(LANGUAGES[0].starter);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [messages, setMessages] = useState(initialMessages);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef(null);

  const socketRef = useRef(null);
  const [userNumber, setUserNumber] = useState(null);

  // Used to prevent received code from being sent back to the server.
  const isReceivingCodeRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socketRef.current = socket;

    socket.emit("join-room", roomId);

    socket.on("user-number", (number) => {
      setUserNumber(number);
    });

    socket.on("receive-message", ({ text, userNumber }) => {
      setMessages((m) => [
        ...m,
        {
          user: `User ${userNumber}`,
          seed: `User ${userNumber}`,
          text,
          mine: false,
        },
      ]);
    });

    // ================================
    // REAL-TIME CODE SYNCHRONIZATION
    // ================================

    socket.on("code-update", ({ code }) => {
      isReceivingCodeRef.current = true;
      setCode(code);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const lang = LANGUAGES[langIdx];

  const handleLangSelect = (i) => {
    setLangIdx(i);
    setCode(LANGUAGES[i].starter);
    setLangOpen(false);
    setOutput(null);
  };

  const handleRun = async () => {
    if (!lang.runnerId) {
      setOutput({ ok: false, text: `${lang.name} isn't wired up to the local runner yet — try Python or JavaScript for now.` });
      return;
    }

    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("http://localhost:3001/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang.runnerId, code }),
      });

      const data = await res.json();
      setOutput({ ok: data.ok, text: data.output });
    } catch (err) {
      setOutput({ ok: false, text: "Couldn't reach the local code runner. Make sure the backend server is running (node server.js in the code-collab-server folder)." });
    } finally {
      setRunning(false);
    }
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;

    const text = chatInput.trim();

    setMessages((m) => [
      ...m,
      {
        user: `User ${userNumber}`,
        seed: `User ${userNumber}`,
        text,
        mine: true,
      },
    ]);

    socketRef.current?.emit("send-message", {
      roomId,
      text,
      userNumber,
    });

    setChatInput("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      fontFamily: "Inter, sans-serif", background: COLORS.cloud, height: "100vh",
      display: "flex", flexDirection: "column", color: COLORS.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        .room-body { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; flex: 1; min-height: 0; padding: 16px; }
        @media (max-width: 800px) { .room-body { grid-template-columns: 1fr; } }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "12px 20px",
        background: COLORS.ink, flexShrink: 0,
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9,
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", cursor: "pointer",
          }}>
          <ArrowLeft size={16} />
        </button>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: COLORS.ink2, borderRadius: 10, padding: "6px 12px",
          fontFamily: "JetBrains Mono, monospace",
        }}>
          <Circle size={7} color={COLORS.volt} fill={COLORS.volt} />
          <span style={{ color: COLORS.volt, fontSize: 13, fontWeight: 600 }}>{roomId}</span>
          <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? COLORS.volt : COLORS.slate, display: "flex" }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center" }}>
          <Avatar seed={userNumber ? `User ${userNumber}` : "You"} size={28} />
        </div>

        <button style={{
          background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9,
          width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", cursor: "pointer",
        }}>
          <Settings size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="room-body">
        {/* Left: editor + output */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {/* Editor */}
          <div style={{
            background: COLORS.ink, borderRadius: 16, flex: 1, display: "flex",
            flexDirection: "column", minHeight: 0, overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, position: "relative",
            }}>
              <div
                onClick={() => setLangOpen((o) => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                  background: COLORS.ink2, borderRadius: 8, padding: "6px 10px",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: lang.color }} />
                <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 600 }}>{lang.name}</span>
                <ChevronDown size={13} color={COLORS.slate} />
              </div>

              {langOpen && (
                <div style={{
                  position: "absolute", top: 44, left: 14, background: COLORS.ink2,
                  borderRadius: 10, padding: 6, zIndex: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                  minWidth: 150,
                }}>
                  {LANGUAGES.map((l, i) => (
                    <div
                      key={l.name}
                      onClick={() => handleLangSelect(i)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                        borderRadius: 7, cursor: "pointer", fontSize: 12.5, color: "#fff",
                        background: i === langIdx ? "rgba(255,255,255,0.06)" : "transparent",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                      {l.name}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ flex: 1 }} />

              <button
                onClick={handleRun}
                disabled={running}
                style={{
                  display: "flex", alignItems: "center", gap: 7, background: COLORS.volt,
                  color: COLORS.ink, border: "none", borderRadius: 8, padding: "7px 14px",
                  fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                }}
              >
                {running ? <Loader2 size={14} className="spin" /> : <Play size={13} fill={COLORS.ink} />}
                {running ? "Running…" : "Run"}
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, position: "relative", width: "100%" }}>
              <Editor
                height="100%"
                width="100%"
                language={lang.monacoId}
                value={code}
                onChange={(value) => {
                  const newCode = value ?? "";

                  setCode(newCode);

                  if (isReceivingCodeRef.current) {
                    isReceivingCodeRef.current = false;
                    return;
                  }

                  socketRef.current?.emit("code-change", {
                    roomId,
                    code: newCode,
                  });
                }}
                theme="vs-dark"
                options={{
                  fontSize: 13.5,
                  fontFamily: "JetBrains Mono, monospace",
                  minimap: { enabled: false },
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  smoothScrolling: true,
                }}
              />
            </div>
          </div>

          {/* Output */}
          <div style={{
            background: COLORS.white, border: `1px solid ${COLORS.cloudDim}`, borderRadius: 16,
            height: 160, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 14px",
              borderBottom: `1px solid ${COLORS.cloudDim}`, color: COLORS.slate,
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              <Terminal size={13} /> OUTPUT
            </div>
            <div style={{
              flex: 1, padding: "12px 16px", fontFamily: "JetBrains Mono, monospace",
              fontSize: 12.5, color: output ? (output.ok ? COLORS.ink : COLORS.coral) : COLORS.slate,
              overflow: "auto", whiteSpace: "pre-wrap",
            }}>
              {running ? "running…" : output ? output.text : "Hit Run to see output here."}
            </div>
          </div>
        </div>

        {/* Right: chat */}
        <div style={{
          background: COLORS.white, border: `1px solid ${COLORS.cloudDim}`, borderRadius: 16,
          display: "flex", flexDirection: "column", minHeight: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7, padding: "12px 16px",
            borderBottom: `1px solid ${COLORS.cloudDim}`, fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            <MessageSquare size={15} color={COLORS.violet} /> Chat
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{
                margin: "auto", textAlign: "center", color: COLORS.slate, fontSize: 13,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <MessageSquare size={22} color={COLORS.cloudDim} />
                No messages yet — say hi to get started.
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, flexDirection: m.mine ? "row-reverse" : "row",
                alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: "85%",
              }}>
                <Avatar seed={m.seed} size={24} />
                <div>
                  {!m.mine && <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 3, fontWeight: 600 }}>{m.user}</div>}
                  <div style={{
                    background: m.mine ? COLORS.violet : COLORS.cloud,
                    color: m.mine ? "#fff" : COLORS.ink,
                    borderRadius: 12,
                    borderBottomRightRadius: m.mine ? 4 : 12,
                    borderBottomLeftRadius: m.mine ? 12 : 4,
                    padding: "8px 12px", fontSize: 13, lineHeight: 1.4,
                  }}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${COLORS.cloudDim}`, flexShrink: 0 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message your room…"
              style={{
                flex: 1, border: `1.5px solid ${COLORS.cloudDim}`, borderRadius: 10,
                padding: "9px 12px", fontSize: 13, background: COLORS.cloud, color: COLORS.ink,
              }}
            />
            <button
              onClick={handleSend}
              style={{
                background: COLORS.violet, border: "none", borderRadius: 10, width: 38,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}