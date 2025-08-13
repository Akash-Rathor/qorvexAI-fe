import React, { useEffect, useRef, useState } from "react";

export default function ScreenShare({ onSend, onStream }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Screen share
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

  // Drag overlay
  const startDrag = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (isDragging) {
      containerRef.current.style.left = `${e.clientX - offset.x}px`;
      containerRef.current.style.top = `${e.clientY - offset.y}px`;
    } else if (isResizing) {
      const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
      setWidth(Math.max(200, Math.min(newWidth, 600))); // min 200px, max 600px
    }
  };

  const stopDrag = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [isDragging, isResizing, offset]);

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
        alignItems: "flex-start",
        zIndex: 9999,
        pointerEvents: "auto",
        width: width,
      }}
      className="bg-transparent"
    >
      {/* Video */}
      <div
        onMouseDown={startDrag}
        style={{
          width: "100%",
          height: "180px",
          background: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          cursor: "grab",
        }}
      >
        {error ? (
          <div className="text-red-600 p-2">{error}</div>
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

      {/* Chat area */}
      <div className="flex flex-col w-full bg-gray-900 p-3 rounded-b-lg shadow-md mt-2">
        {/* Expanding textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && input.trim()) {
              e.preventDefault();
              onSend(input.trim());
              setInput("");
            }
          }}
          rows={3}
          className="w-full px-3 py-2 mb-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-auto"
          style={{
            maxHeight: window.innerHeight - 150, // leave space for top video + margin
          }}
        />

        {/* Send button */}
        <button
          onClick={() => {
            if (input.trim()) {
              onSend(input.trim());
              setInput("");
            }
          }}
          className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors duration-200"
        >
          Send
        </button>
      </div>

      {/* Resizer handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="w-full h-1 bg-gray-500 cursor-ew-resize mt-1 rounded-sm"
        title="Drag to resize width"
      />
    </div>
  );
}
