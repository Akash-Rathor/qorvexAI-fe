// src/App.jsx
import React, { useState, useCallback } from "react";
import ScreenShare from "./components/ScreenShare";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [videoStream, setVideoStream] = useState(null);

  const handleStream = useCallback((stream) => {
    setVideoStream(stream);
  }, []);

  const handleSend = useCallback((msg) => {
    if (msg.trim()) {
      setMessages((prev) => [...prev, { from: "me", text: msg }]);
    }
  }, []);

  return (
    <div className="w-full h-full">
      <ScreenShare onSend={handleSend} onStream={handleStream} />
    </div>
  );
}