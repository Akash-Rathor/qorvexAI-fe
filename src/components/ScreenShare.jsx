import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Minimize2, MessageSquare } from "lucide-react";

export default function ScreenShare({ onStream }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [width, setWidth] = useState(360);
  const [height, setHeight] = useState(420);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(uuidv4());
  const [isMinimized, setIsMinimized] = useState(false);

  const wsRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // --- Screen share + frame WebSocket ---
  useEffect(() => {
    if (isMinimized) return;

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

        wsRef.current = new WebSocket(
          `ws://localhost:8000/stream_frame/${sessionId}`
        );
        wsRef.current.binaryType = "arraybuffer";

        captureIntervalRef.current = setInterval(() => {
          if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== 1) return;

          const canvas = document.createElement("canvas");
          canvas.width = 480;
          canvas.height = 270;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (blob) blob.arrayBuffer().then((buf) => wsRef.current.send(buf));
            },
            "image/webp", // ✅ always WebP
            0.5 // ✅ compressed quality
          );
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
  }, [sessionId, isMinimized]);

  // --- Chat send ---
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, from: "user" }]);
    setInput("");

    try {
      const res = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, prompt: userMessage }),
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

  // --- Minimized bubble ---
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{ pointerEvents: "auto" }} // ✅ ensures clickable
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer shadow-xl transition-all"
      >
        <MessageSquare size={24} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        width,
        height,
        zIndex: 9999,
        pointerEvents:"auto"
      }}
      className="rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-700 bg-[#121212]"
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-700 to-purple-700 px-3 py-2 text-white text-sm font-semibold cursor-default">
        <span>Qorvex AI</span>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded hover:bg-black/20 transition-colors"
          style={{ pointerEvents: "auto" }} // ✅ ensures clickable
        >
          <Minimize2 size={16} />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 bg-black">
        {error ? (
          <div className="text-red-500 p-2 text-sm">{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover rounded-b-md"
          />
        )}
      </div>

      {/* Chat */}
      <div className="flex flex-col bg-gray-900 p-3 overflow-hidden" style={{ height: "45%" }}>
        <div className="flex flex-col gap-2 overflow-y-auto mb-2 flex-1 pr-1">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-lg max-w-[75%] text-sm shadow ${
                msg.from === "user"
                  ? "bg-blue-600 text-white self-end"
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
          className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          style={{ minHeight: "44px", maxHeight: "80px" }}
        />

        <div className="flex justify-between mt-2 gap-2">
          <button
            onClick={setNewChat}
            className="flex-1 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg py-1 text-xs transition-all"
          >
            New Chat
          </button>
          <button
            onClick={handleSend}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-1 text-xs transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
