import { useState, useRef } from "react";

export default function ScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef(null);

  const startShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Optional: if you want to capture system audio
      });
      videoRef.current.srcObject = stream;
      setIsSharing(true);

      // Stop sharing when stream ends
      stream.getVideoTracks()[0].onended = () => {
        setIsSharing(false);
        videoRef.current.srcObject = null;
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopShare = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsSharing(false);
    videoRef.current.srcObject = null;
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Live Screen Share</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{ width: "80%", border: "2px solid #ccc", borderRadius: "10px" }}
      ></video>
      <div style={{ marginTop: "10px" }}>
        {!isSharing ? (
          <button onClick={startShare}>Start Screen Share</button>
        ) : (
          <button onClick={stopShare}>Stop Screen Share</button>
        )}
      </div>
    </div>
  );
}
