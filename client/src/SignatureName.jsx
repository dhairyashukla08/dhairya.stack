import { useEffect, useRef, useState } from "react";
import { me } from "./data.js";

function useTypewriter(text, { enabled = true, startDelay = 500, minMs = 55, maxMs = 130 } = {}) {
  const [out, setOut] = useState(enabled ? "" : text);
  const [done, setDone] = useState(!enabled);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setOut(text);
      setDone(true);
      return;
    }
    let cancelled = false;
    let i = 0;
    setOut("");
    setDone(false);
    const step = () => {
      if (cancelled) return;
      i += 1;
      setOut(text.slice(0, i));
      if (i < text.length) {
        timer.current = setTimeout(step, minMs + Math.random() * (maxMs - minMs));
      } else {
        setDone(true);
      }
    };
    timer.current = setTimeout(step, startDelay);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [text, enabled]);

  return { out, done };
}

// Types your name out letter by letter, then settles into a floating,
// glowing "neon sign" with layered pseudo-3D depth, orbiting particles,
// and a tilt that follows the mouse. Pure CSS + React — no WebGL, no
// external assets to load, so nothing here can fail to fetch.
export default function SignatureName() {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { out, done } = useTypewriter(me.name, { enabled: !reduce });

  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(null);

  useEffect(() => {
    if (reduce) return;
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      target.current = {
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      };
    };
    const onLeave = () => {
      target.current = { x: 0, y: 0 };
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      if (textRef.current) {
        const rx = (-current.current.y * 18).toFixed(2);
        const ry = (current.current.x * 22).toFixed(2);
        textRef.current.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [reduce]);

  return (
    <div className="name-sig" ref={wrapRef}>
      <span className="sr-only">{me.name}</span>
      <div className={`name-sig-stage${done ? " settled" : ""}`} aria-hidden="true">
        {!reduce && (
          <div className="name-sig-particles">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className={`p p-${i}`} />
            ))}
          </div>
        )}
        <h2 className="name-sig-text" ref={textRef}>
          {out}
          {!done && <span className="name-sig-cursor">|</span>}
        </h2>
      </div>
    </div>
  );
}