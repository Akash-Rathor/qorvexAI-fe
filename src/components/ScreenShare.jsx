import React, { useEffect, useRef, useState } from "react";

export default function ScreenShare({ onSend, onStream }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const start = async () => {
      try {
        if (!window.electronAPI?.getScreenStream) {
          setError("Electron screen API not found.");
          return;
        }
        const source = await window.electronAPI.getScreenStream();
        if (!source?.id) {
          setError("No screen source found.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: source.id,
              minWidth: 800,
              maxWidth: 1920,
              minHeight: 600,
              maxHeight: 1080,
            },
          },
        });

        if (videoRef.current) videoRef.current.srcObject = stream;
        if (onStream) onStream(stream);
      } catch (err) {
        console.error(err);
        setError("Error capturing screen: " + err.message);
      }
    };
    start();
  }, []);

  const startDrag = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    containerRef.current.style.left = `${e.clientX - offset.x}px`;
    containerRef.current.style.top = `${e.clientY - offset.y}px`;
  };

  const stopDrag = () => setIsDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => window.electronAPI.setClickable(true)}
      onMouseLeave={() => window.electronAPI.setClickable(false)}
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 9999,
        pointerEvents: "auto", // ✅ ensures drag/click work
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          width: "320px",
          height: "180px",
          background: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
          cursor: "grab",
        }}
      >
        {error ? (
          <div style={{ color: "#b00", padding: 8 }}>{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>

      <div style={{ marginTop: 8, display: "flex", width: "100%" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "6px",
            border: "1px solid #ccc",
            borderRadius: "4px 0 0 4px",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              onSend(input.trim());
              setInput("");
            }
          }}
        />
        <button
          style={{
            padding: "6px 10px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "0 4px 4px 0",
          }}
          onClick={() => {
            if (input.trim()) {
              onSend(input.trim());
              setInput("");
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
