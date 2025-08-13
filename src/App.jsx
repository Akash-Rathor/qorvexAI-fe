// src/App.jsx
import { useEffect, useState } from "react";

function App() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>AI Peer - Screen Share</h1>
      <button onClick={() => window.electronAPI.startScreenShare()}>
        Start Sharing
      </button>
    </div>
  );
}

export default App;
