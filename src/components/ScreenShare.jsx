import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function ScreenShare({ onStream }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState(""); // 'width', 'height', 'both'
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(300);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(uuidv4());
  const wsRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Screen share + frame WebSocket
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

        // WebSocket for sending frames
        wsRef.current = new WebSocket(`ws://localhost:8000/stream_frame/${sessionId}`);
        wsRef.current.binaryType = "arraybuffer";

        captureIntervalRef.current = setInterval(() => {
          if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== 1) return;
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) blob.arrayBuffer().then((buf) => wsRef.current.send(buf));
          }, "image/jpeg", 0.7);
        }, 500);
      } catch (err) {
        console.error(err);
        setError("Error capturing screen: " + err.message);
      }
    };
    start();

    return () => {
      clearInterval(captureIntervalRef.current);
      wsRef.current?.close();
    };
  }, [sessionId]);

  // Drag & resize handlers
  const onMouseMove = (e) => {
    if (isDragging) {
      containerRef.current.style.left = `${e.clientX - offset.x}px`;
      containerRef.current.style.top = `${e.clientY - offset.y}px`;
    }
    if (isResizing) {
      if (resizeDir === "width" || resizeDir === "both") {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        setWidth(Math.max(200, Math.min(newWidth, 800)));
      }
      if (resizeDir === "height" || resizeDir === "both") {
        const rect = containerRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        setHeight(Math.max(150, Math.min(newHeight, 600)));
      }
    }
  };

  const stopDragResize = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDir("");
  };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDragResize);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragResize);
    };
  }, [isDragging, isResizing, offset, resizeDir]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
    }
  }, [input]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Message sending (streaming response)
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, from: "user" }]);
    setInput("");

    try {
      const res = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, text: userMessage }),
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = "";

      setMessages((prev) => [...prev, { text: "Thinking...", from: "bot" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botMessage += chunk;
        setMessages((prev) => {
          const prevMsgs = [...prev];
          if (prevMsgs[prevMsgs.length - 1]?.from === "bot") {
            prevMsgs[prevMsgs.length - 1].text = botMessage;
          } else {
            prevMsgs.push({ text: botMessage, from: "bot" });
          }
          return prevMsgs;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { text: "Error sending message", from: "bot" }]);
    }
  };

  // New chat
  const setNewChat = async () => {
    try {
      await fetch("http://localhost:8000/clear_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (err) {
      console.error("Failed to clear session:", err);
    }
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setMessages([]);
    setInput("");
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => window.electronAPI?.setClickable(true)}
      onMouseLeave={() => window.electronAPI?.setClickable(false)}
      style={{
        position: "fixed",
        top: 20,
        left: 20,  // better than right:20 for resizing
        width: width,
        height: height, // dynamic height state
        maxWidth: "90vw",
        maxHeight: "90vh",
        zIndex: 9999,
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        background: "#1a1a1a",
        borderRadius: "8px",
        overflow: "hidden",
        boxSizing: "border-box",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Video */}
        <div
          onMouseDown={(e) => {
            const rect = containerRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            setIsDragging(true);
          }}
          style={{
            width: "100%",
            height: "50%", // half of container height
            background: "#000",
            cursor: "grab",
            objectFit: "cover",
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
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        )}
      </div>

      {/* Chat */}
      <div className="flex flex-col w-full h-1/2 bg-gray-900 p-1 rounded-b-lg shadow-md"
          style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#111",
          padding: "8px",
          overflow: "hidden",
        }}
        >
        <div className="flex flex-col gap-1 overflow-y-auto mb-2 max-h-full">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-2 py-1 rounded-b-lg ${
                msg.from === "user"
                  ? "bg-blue-700 text-white self-end"
                  : "bg-gray-700 text-white self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden"
        />

        <div className="flex justify-between mt-2 gap-2">
          <button
            onClick={setNewChat}
            className="flex-1 bg-red-700 hover:bg-gray-800 text-white font-medium rounded-md transition-all duration-200 text-xs flex justify-center items-center"
          >
            New Chat
          </button>
          <button
            onClick={handleSend}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all duration-200 text-xs flex justify-center items-center"
          >
            Send
          </button>
        </div>
      </div>

      {/* Resize handles */}
      <div
        onMouseDown={() => {
          setIsResizing(true);
          setResizeDir("width");
        }}
        style={{
          position: "absolute",
          width: "16px",
          height: "16px",
          bottom: 0,
          right: 0,
          cursor: "nwse-resize",
          background: "transparent",
        }}
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-gray-500"
        title="Drag to resize width"
      />
      <div
        onMouseDown={() => {
          setIsResizing(true);
          setResizeDir("height");
        }}
        className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize bg-gray-500"
        title="Drag to resize height"
      />
      <div
        onMouseDown={() => {
          setIsResizing(true);
          setResizeDir("both");
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-gray-500"
        title="Drag to resize both"
      />
    </div>
  );
}
