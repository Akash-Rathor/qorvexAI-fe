import React, { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Minimize, MessageSquare } from "lucide-react";

export default function ScreenShare({ onStream }) {
  const videoRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamRef = useRef(null); // Store stream to prevent premature cleanup

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(uuidv4());
  const [isMinimized, setIsMinimized] = useState(false);
  const [prevSize, setPrevSize] = useState({ width: 360, height: 420 });
  const [prevPos, setPrevPos] = useState({ x: 20, y: 20 });

  const wsRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Debounce function to limit rapid window updates
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // --- Screen share + frame WebSocket ---
  useEffect(() => {
    if (isMinimized || streamRef.current) return; // Prevent re-running if stream exists

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

        streamRef.current = stream; // Store stream
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
            "image/jpeg",
            0.7
          );
        }, 1000); // Increased interval to reduce load
      } catch (err) {
        console.error(err);
        setError("Error capturing screen: " + err.message);
      }
    };
    start();

    return () => {
      clearInterval(captureIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
  }, [sessionId, isMinimized, onStream]);

  // --- Chat send ---
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, from: "user" }]);
    setInput("");
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: "smooth",
          block: "end"
        });
      }
    }, 50);
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
  }, [input, sessionId]);

  const setNewChat = useCallback(async () => {
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
  }, [sessionId]);

      function handleMinimize(mainWindow, bubbleWindow) {
        const { screen } = require("electron");

        mainWindow.hide();

        const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

        if (!bubbleWindow) {
          bubbleWindow = createBubbleWindow();
        }

        const bubbleBounds = bubbleWindow.getBounds();
        const bubbleWidth = bubbleBounds.width || 60;  // fallback if window has no size yet
        const bubbleHeight = bubbleBounds.height || 60;

        // Clamp X and Y so the bubble never goes outside the screen
        const x = Math.max(0, screenWidth - bubbleWidth - 20);
        const y = Math.max(0, screenHeight - bubbleHeight - 20);

        bubbleWindow.setBounds({
          x,
          y,
          width: bubbleWidth,
          height: bubbleHeight,
        });

        bubbleWindow.showInactive(); // show but don’t steal focus

        return bubbleWindow;
      }



  const handleUnminimize = useCallback(

    debounce(async () => {
      if (!window.electronAPI) return;
      window.electronAPI.setWindowSize(prevSize?.width || 360, prevSize?.height || 420);
      window.electronAPI.setWindowPosition(prevPos?.x || 20, prevPos?.y || 20, prevSize?.width || 360, prevSize?.height || 420);
      window.electronAPI.setResizable(true);
      setIsMinimized(false);
    }, 100),
    [prevSize, prevPos]
  );
const toggleWidgetSizeChange = useCallback(
  debounce(async () => {
    if (!window.electronAPI) return;

    const { width: screenWidth, height: screenHeight } =
      await window.electronAPI.getScreenWorkArea();

    const [width, height] = await window.electronAPI.getWindowSize();
    const [x, y] = await window.electronAPI.getWindowPosition();
    setPrevSize({ width, height });
    setPrevPos({ x, y });

    const bubbleWidth = 60;
    const bubbleHeight = 60;
    const xPos = screenWidth - bubbleWidth - 20;
    const yPos = screenHeight - bubbleHeight - 20;

    await window.electronAPI.setWindowBounds(xPos, yPos, bubbleWidth, bubbleHeight);
    setIsMinimized(true);
  }, 100),
  [prevSize, prevPos]
);

return (
  isMinimized ? 
  <button className="minimized-bubble" onClick={handleUnminimize} style={{ backgroundColor: "transparent" , WebkitAppRegion: "drag", cursor: "move"}}>
    <img src="/qorvex_ai_icon.png" alt="Qorvex AI Icon" style={{ width: "42px", height: "40px" , borderRadius:"50%"}}/>
  </button>
  :
  <div
    style={{
      width: "100%",
      minHeight: "50vh",
      maxHeight: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}
    className="rounded-xl shadow-2xl border border-gray-700 bg-[#121212]"
  >
    {/* Header - Fixed height */}
    <div
      style={{ WebkitAppRegion: "drag", cursor: "move" }}
      className="flex justify-between items-center bg-gradient-to-r from-blue-700 to-purple-700 px-2 py-1 text-white font-semibold flex-shrink-0 text-xs"
    >
      <span className="text-md">QorvexAI</span>
      <span 
        onClick={() => toggleWidgetSizeChange()}
        className="bg-black rounded-full hover:ring-1 hover:ring-blue-500 flex justify-center items-center p-1 cursor-pointer transition-all duration-200"
      >
        <Minimize size={12} color="white"/>
      </span>
    </div>

    {/* Video - Fixed height */}
    <div 
      className="bg-black flex-shrink-0"
      style={{ height: "40%" }}
    >
      {error ? (
        <div className="text-red-500 p-2 text-xs">{error}</div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      )}
    </div>

    {/* Chat Container - Fixed height */}
    <div 
      className="flex flex-col bg-gray-900"
      style={{ 
        minHeight: "100px",
        maxHeight: "30%",
        // overflow: "hidden" // Prevent container overflow
      }}
    >
      {/* Messages - Scrollable area */}
      <div 
        className="overflow-y-auto flex flex-col gap-2"
        style={{ 
          padding: "8px 8px 0 6px",
          height: "calc(100% - 60px)", // Reserve exactly 60px for input
          scrollBehavior: "smooth"
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`px-2 py-1 rounded-lg text-xs shadow flex-shrink-0 ${
              msg.from === "user"
                ? "bg-blue-600 text-white self-end"
                : "bg-gray-700 text-white self-start"
            }`}
            style={{ 
              lineHeight: "1.3",
              maxWidth: "85%",
              wordWrap: "break-word"
            }}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div 
        className="bg-gray-900 border-t border-gray-700 flex-shrink-0"
        style={{ 
          height: "60px", // Fixed height
          padding: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
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
          className="border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none text-xs"
          style={{ 
            flex: "1",
            height: "32px", // Fixed height
            padding: "6px 8px",
            boxSizing: "border-box",
            overflow: "hidden" // Prevent expansion
          }}
        />

        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button
            onClick={setNewChat}
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-all text-xs"
            style={{ 
              width: "60px",
              height: "32px",
              fontSize: "10px",
              backgroundColor: "#e63946",
              whiteSpace: "nowrap"
            }}
          >
            New
          </button>
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all text-xs"
            style={{ 
              width: "50px",
              height: "32px",
              fontSize: "11px",
              backgroundColor: "black"
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
)};