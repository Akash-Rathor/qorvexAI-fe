import React, { useState } from "react";
import ScreenShare from "./components/ScreenShare";
// import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [videoStream, setVideoStream] = useState(null);

  const handleStream = (stream) => {
    setVideoStream(stream);
  };

  const handleSend = (msg) => {
    if (msg.trim()) {
      setMessages((prev) => [...prev, { from: "me", text: msg }]);
    }
  };

  return (
    <div style={{ pointerEvents: "none" }}> {/* This lets clicks pass through */}
      <ScreenShare onSend={handleSend} onStream={handleStream} />
    </div>
  );
}
