import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid"; // npm i uuid

export default function ScreenShare({ onStream }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(320);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(uuidv4());

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

  // Drag / Resize overlay
  const onMouseMove = (e) => {
    if (isDragging) {
      containerRef.current.style.left = `${e.clientX - offset.x}px`;
      containerRef.current.style.top = `${e.clientY - offset.y}px`;
    }
    if (isResizing) {
      const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
      setWidth(Math.max(200, Math.min(newWidth, 600)));
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

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      const maxHeight = 150;
      ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
    }
  }, [input]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message and handle streaming response
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

      // Stream chunks
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botMessage += chunk;
        // Update message in real-time
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

  // New chat: clears backend session and resets UI
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
      onMouseEnter={() => window.electronAPI.setClickable(true)}
      onMouseLeave={() => window.electronAPI.setClickable(false)}
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        width: width,
        maxHeight: "90vh",
        zIndex: 9999,
        pointerEvents: "auto",
      }}
      className="flex flex-col items-start bg-transparent"
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
        {/* Messages */}
        <div className="flex flex-col gap-1 overflow-y-auto mb-2 max-h-[50vh]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-2 py-1 rounded-md ${
                msg.from === "user" ? "bg-blue-700 text-white self-end" : "bg-gray-700 text-white self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Expanding textarea */}
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

        {/* buttons */}
        <div className="flex justify-between mt-2 gap-2">
          <button
            onClick={handleSend}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all duration-200 text-xs flex justify-center items-center"
          >
            Send
          </button>

          <button
            onClick={setNewChat}
            className="flex-1 bg-red-700 hover:bg-gray-800 text-white font-medium rounded-md transition-all duration-200 text-xs flex justify-center items-center"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Width Resizer */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="w-full h-1 bg-gray-500 cursor-ew-resize mt-1 rounded-sm"
        title="Drag to resize width"
      />
    </div>
  );
}
