"use client";

import { useEffect, useRef } from "react";

/**
 * Hosts the Three.js robot (public/robot/robot.html) in a same-origin iframe
 * and drives its animation state via postMessage. `state` is one of
 * idle | listening | thinking | speaking.
 */
export default function RobotStage({ state = "idle", className = "" }) {
  const ref = useRef(null);
  const readyRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  function post(msg) {
    ref.current?.contentWindow?.postMessage(msg, "*");
  }

  useEffect(() => {
    function onMsg(e) {
      if (e.data?.roboReady) {
        readyRef.current = true;
        post({ robot: { action: "set", state: stateRef.current } });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (readyRef.current) post({ robot: { action: "set", state } });
  }, [state]);

  return (
    <iframe
      ref={ref}
      src="/robot/robot.html"
      title="Robo the study buddy"
      className={className}
      style={{ border: 0, width: "100%", height: "100%", background: "transparent" }}
      onLoad={() => post({ robot: { action: "set", state: stateRef.current } })}
    />
  );
}
