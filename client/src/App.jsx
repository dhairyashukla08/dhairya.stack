import { useEffect, useRef, useState } from "react";
import {
  me,
  now,
  skills,
  jobs,
  projects as localProjects,
  education,
  strengths,
  floatTech,
  whatIDo,
  howIWork,
  coffee,
} from "./data.js";
import { THEMES, DEFAULT_THEME } from "./themes.js";
import { playSuccess, playError, resumeAudio, playSelect } from "./sound.js";

const API = import.meta.env.VITE_API_URL || "";
const NAV = [
  "about",
  "approach",
  "experience",
  "projects",
  "skills",
  "contact",
];
const MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? "⌘" : "Ctrl";

const go = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const CLICKABLE =
  'a,button,input,textarea,select,summary,[role="button"],[tabindex]';
function isClickable(el) {
  const match = el?.closest?.(CLICKABLE);
  if (match) return !match.disabled && match.getAttribute("tabindex") !== "-1";
  return !!el && window.getComputedStyle(el).cursor === "pointer";
}
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const raf = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!fine || reduce) return; // keep the native cursor on touch devices and for reduced motion

    document.documentElement.classList.add("has-custom-cursor");

    const move = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const textField = el?.closest("input,textarea");
      const clickable = isClickable(el);
      ringRef.current?.classList.toggle("hover", !!clickable && !textField);
      ringRef.current?.classList.toggle("text", !!textField);
    };
    const down = () => ringRef.current?.classList.add("down");
    const up = () => ringRef.current?.classList.remove("down");
    const leave = () => {
      dotRef.current?.classList.add("hide");
      ringRef.current?.classList.add("hide");
    };
    const enter = () => {
      dotRef.current?.classList.remove("hide");
      ringRef.current?.classList.remove("hide");
    };

    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.18;
      ring.current.y += (pos.current.y - ring.current.y) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    document.addEventListener("mouseleave", leave);
    document.addEventListener("mouseenter", enter);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener("mouseenter", enter);
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" />
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" />
    </>
  );
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* ---------- Hero terminal: the signature piece ---------- */
const COMMANDS = {
  help: () => [
  "whoami  skills  experience  projects  contact  status",
  "github  linkedin  clear  matrix   (try: sudo hire dhairya)",
],
  whoami: () => [me.name + " | " + me.location, ...me.roles],
  skills: () => Object.entries(skills).map(([k, v]) => `${k}: ${v.join(", ")}`),
  experience: () => jobs.map((j) => `${j.when}  ${j.role}, ${j.org}`),
  projects: () =>
    localProjects.map((p) => `${p.title}: ${p.stack.join(" / ")}`),
  contact: () => [me.email, me.linkedin],
  github: () => {
    window.open(me.github, "_blank");
    return ["Opening GitHub..."];
  },
  linkedin: () => {
    window.open(me.linkedin, "_blank");
    return ["Opening LinkedIn..."];
  },
  status: async () => {
    const start = performance.now();
    try {
      const r = await fetch(`${API}/api/status`);
      const latency = Math.round(performance.now() - start);
      const d = await r.json();
      return [
        `API: online (${latency}ms)`,
        `Database: ${d.dbConnected ? "connected" : "disconnected"}`,
        `Server uptime: ${formatUptime(d.uptimeSeconds)}`,
      ];
    } catch {
      return [
        "API: unreachable — the server may be sleeping (free hosting spins down when idle).",
      ];
    }
  },
  matrix: () => {
    window.dispatchEvent(new Event("trigger-matrix"));
    return ["Initiating the matrix... (or press ↑ ↑ ↓ ↓ ← → ← → B A anytime)"];
  },
  "sudo hire dhairya": () => [
    "Permission granted. Sending you to the contact form...",
    () => go("contact"),
  ],
};

function Terminal() {
  const [log, setLog] = useState([{ cmd: "whoami", out: COMMANDS.whoami() }]);
  const [val, setVal] = useState("");
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollTo(0, end.current.scrollHeight);
  }, [log]);
  const run = async (e) => {
    e.preventDefault();
    const cmd = val.trim().toLowerCase();
    setVal("");
    if (cmd === "clear") return setLog([]);
    const fn = COMMANDS[cmd];
    if (!fn) {
      setLog((l) => [
        ...l,
        { cmd, out: [`command not found: ${cmd}. Type help.`] },
      ]);
      return;
    }
    const result = fn();
    if (result instanceof Promise) {
      setLog((l) => [...l, { cmd, out: ["..."] }]);
      const resolved = await result;
      const cb = resolved.find((o) => typeof o === "function");
      setLog((l) => {
        const copy = [...l];
        copy[copy.length - 1] = {
          cmd,
          out: resolved.filter((o) => typeof o === "string"),
        };
        return copy;
      });
      if (cb) setTimeout(cb, 700);
      return;
    }
    const cb = result.find((o) => typeof o === "function");
    setLog((l) => [
      ...l,
      { cmd, out: result.filter((o) => typeof o === "string") },
    ]);
    if (cb) setTimeout(cb, 700);
  };
  return (
    <div
      className="term"
      onClick={(e) => e.currentTarget.querySelector("input").focus()}
    >
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span>dhairya@portfolio ~ </span>
      </div>
      <div className="term-body" ref={end} aria-live="polite">
        <p className="dim">Type a command. Start with help.</p>
        {log.map((l, i) => (
          <div key={i}>
            <p>
              <b>$</b> {l.cmd}
            </p>
            {l.out.map((o, j) => (
              <p key={j} className="out">
                {o}
              </p>
            ))}
          </div>
        ))}
        <form onSubmit={run}>
          <b>$</b>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            aria-label="Terminal command"
            spellCheck="false"
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}

/* ---------- Floating tech badges around the hero ---------- */
function FloatIcons() {
  return (
    <div className="float-icons" aria-hidden="true">
      {floatTech.map((t, i) => (
        <span key={t} className={`fi fi-${i}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

/* ---------- Continuous skills/strengths marquee ---------- */
function Marquee({ items }) {
  const loop = [...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {loop.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Reusable pieces ---------- */
function Section({ id, title, children }) {
  return (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ApproachList({ title, items }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul className="approach-list">
        {items.map((x) => (
          <li key={x.t}>
            <strong>{x.t}</strong>
            <span>{x.d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeyHint({ onOpen }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const h = (e) =>
      (e.ctrlKey || e.metaKey) && e.key === "k" && setShow(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  if (!show) return null;
  return (
    <button className="hint" onClick={onOpen}>
      <span className="k-desk">
        Press <kbd>{MOD}</kbd>
        <kbd>K</kbd> anywhere
      </span>
      <span className="k-touch">Tap for quick menu</span>
    </button>
  );
}

function QuickReach() {
  const [ok, setOk] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(me.email);
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  };
  return (
    <div className="cta">
      <button className="btn" onClick={copy}>
        {ok ? "Copied" : "Copy email"}
      </button>
      <a className="btn ghost" href={`mailto:${me.email}`}>
        Open mail app
      </a>
      <a className="btn ghost" href="/dhairyaResume.pdf" download>
        Download resume
      </a>
    </div>
  );
}

function Contact() {
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState({ s: "idle", msg: "" });
  const send = async (e) => {
    e.preventDefault();
    setState({ s: "busy", msg: "" });
    try {
      const r = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setState({
        s: "ok",
        msg: "Message sent. I will reply within a couple of days.",
      });
      setF({ name: "", email: "", message: "" });
    } catch (err) {
      setState({
        s: "err",
        msg: err.message || `Could not send. Email me directly at ${me.email}.`,
      });
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="contact" onSubmit={send}>
      <label>
        Name
        <input required value={f.name} onChange={set("name")} />
      </label>
      <label>
        Email
        <input required type="email" value={f.email} onChange={set("email")} />
      </label>
      <label>
        Message
        <textarea
          required
          rows="5"
          value={f.message}
          onChange={set("message")}
        />
      </label>
      <button disabled={state.s === "busy"}>
        {state.s === "busy" ? "Sending" : "Send message"}
      </button>
      {state.msg && (
        <p className={state.s} role="status">
          {state.msg}
        </p>
      )}
    </form>
  );
}

/* ---------- Ctrl+K palette ---------- */
function Palette({ open, close }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
    }
  }, [open]);
  const items = [
  ...NAV.map((n) => ({ t: `Go to ${n}`, f: () => go(n) })),
  { t: "Email me", f: () => (window.location.href = `mailto:${me.email}`) },
  { t: "Copy email", f: () => navigator.clipboard?.writeText(me.email) },
  { t: "Download resume", f: () => window.open("/dhairyaResume.pdf") },
  { t: "Open GitHub", f: () => window.open(me.github) },
  { t: "Open LinkedIn", f: () => window.open(me.linkedin) },
].filter((x) => x.t.toLowerCase().includes(q.toLowerCase()));
  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setI((x) => Math.min(x + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setI((x) => Math.max(x - 1, 0));
    }
    if (e.key === "Enter" && items[i]) {
      items[i].f();
      close();
    }
  };
  if (!open) return null;
  return (
    <div className="pal" onClick={close}>
      <div onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Type a command"
          value={q}
          onKeyDown={onKey}
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
          }}
        />
        {items.map((x, n) => (
          <button
            key={x.t}
            className={n === i ? "on" : ""}
            onMouseEnter={() => setI(n)}
            onClick={() => {
              x.f();
              close();
            }}
          >
            {x.t}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Theme switcher ---------- */
function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || DEFAULT_THEME,
  );
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const pick = (id) => {
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem("theme", id);
    setTheme(id);
    setOpen(false);
  };

  return (
    <div className="theme-switch" ref={ref}>
      <button
        className="kbd"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Change theme"
      >
        🎨
      </button>
      {open && (
        <div className="theme-menu" role="menu">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="menuitem"
              className={t.id === theme ? "on" : ""}
              onClick={() => pick(t.id)}
            >
              <span
                className="swatch"
                style={{
                  background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)`,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCards() {
  const [gh, setGh] = useState(null);

  useEffect(() => {
    const user = me.github.split("/").filter(Boolean).pop();
    fetch(`https://api.github.com/users/${user}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.message)
          setGh({ repos: d.public_repos, followers: d.followers });
      })
      .catch(() => {});
  }, []);

  const cards = [
    {
      key: "github",
      label: "GitHub",
      mark: "GH",
      href: me.github,
      sub: gh
        ? `${gh.repos} repos · ${gh.followers} followers`
        : "View my repositories",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      mark: "in",
      href: me.linkedin,
      sub: "Connect professionally",
    },
    {
      key: "leetcode",
      label: "LeetCode",
      mark: "LC",
      href: me.leetcode,
      sub: "Problem solving & DSA",
    },
  ];

  return (
    <div className="profiles">
      <h3>Find me elsewhere</h3>
      <div className="profile-row">
        {cards.map((c) => (
          <a
            key={c.key}
            className="profile-card"
            href={c.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className="mark">{c.mark}</span>
            <span>
              <strong>{c.label}</strong>
              <span className="sub">{c.sub}</span>
            </span>
          </a>
        ))}
      </div>
      <SnakeGraph />
    </div>
  );
}

const SNAKE_COLS = 28;
const SNAKE_ROWS = 7;
const SNAKE_TOTAL = SNAKE_COLS * SNAKE_ROWS;
const cellIndex = (x, y) => y * SNAKE_COLS + x;

function randomEmptyCell(occupied) {
  let x, y, key;
  do {
    x = Math.floor(Math.random() * SNAKE_COLS);
    y = Math.floor(Math.random() * SNAKE_ROWS);
    key = cellIndex(x, y);
  } while (occupied.has(key));
  return { x, y };
}

function freshSnakeState() {
  const startX = Math.floor(SNAKE_COLS / 2);
  const startY = Math.floor(SNAKE_ROWS / 2);
  const snake = [{ x: startX, y: startY }];
  const occupied = new Set([cellIndex(startX, startY)]);
  const food = new Set();
  for (let i = 0; i < 10; i++) {
    const c = randomEmptyCell(occupied);
    occupied.add(cellIndex(c.x, c.y));
    food.add(cellIndex(c.x, c.y));
  }
  return { snake, dir: { x: 1, y: 0 }, food };
}

function SnakeGraph() {
  const stateRef = useRef(null);
  const [, force] = useState(0);
  if (!stateRef.current) stateRef.current = freshSnakeState();

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      const s = stateRef.current;
      const head = s.snake[0];
      const bodySet = new Set(s.snake.map((p) => cellIndex(p.x, p.y)));

      let target = null,
        best = Infinity;
      s.food.forEach((key) => {
        const fx = key % SNAKE_COLS,
          fy = Math.floor(key / SNAKE_COLS);
        const d = Math.abs(fx - head.x) + Math.abs(fy - head.y);
        if (d < best) {
          best = d;
          target = { x: fx, y: fy };
        }
      });

      const options = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      const scored = options.map((d) => {
        const nx = (head.x + d.x + SNAKE_COLS) % SNAKE_COLS;
        const ny = (head.y + d.y + SNAKE_ROWS) % SNAKE_ROWS;
        const key = cellIndex(nx, ny);
        const tailKey = cellIndex(
          s.snake[s.snake.length - 1].x,
          s.snake[s.snake.length - 1].y,
        );
        const collides = bodySet.has(key) && key !== tailKey;
        const reverse =
          s.snake.length > 1 && d.x === -s.dir.x && d.y === -s.dir.y;
        const dist = target
          ? Math.abs(nx - target.x) + Math.abs(ny - target.y)
          : 0;
        return { d, nx, ny, key, collides, reverse, dist };
      });

      const choice =
        scored
          .filter((o) => !o.collides && !o.reverse)
          .sort((a, b) => a.dist - b.dist)[0] ||
        scored.filter((o) => !o.collides).sort((a, b) => a.dist - b.dist)[0] ||
        scored[0];

      s.dir = choice.d;
      const newHead = { x: choice.nx, y: choice.ny };
      const newKey = cellIndex(newHead.x, newHead.y);
      const ate = s.food.has(newKey);

      s.snake.unshift(newHead);
      if (ate) {
        s.food.delete(newKey);
        if (s.food.size === 0 || s.snake.length > SNAKE_TOTAL * 0.35) {
          if (s.snake.length > SNAKE_TOTAL * 0.35)
            s.snake = s.snake.slice(0, 3);
          const occ = new Set(s.snake.map((p) => cellIndex(p.x, p.y)));
          const count = 8 + Math.floor(Math.random() * 6);
          for (let i = 0; i < count; i++) {
            const c = randomEmptyCell(occ);
            occ.add(cellIndex(c.x, c.y));
            s.food.add(cellIndex(c.x, c.y));
          }
        }
      } else {
        s.snake.pop();
      }
      force((n) => n + 1);
    }, 140);
    return () => clearInterval(id);
  }, []);

  const s = stateRef.current;
  const bodySet = new Set(s.snake.map((p) => cellIndex(p.x, p.y)));
  const headKey = cellIndex(s.snake[0].x, s.snake[0].y);

  const cells = [];
  for (let i = 0; i < SNAKE_TOTAL; i++) {
    let cls = "cell";
    if (i === headKey) cls = "cell head";
    else if (bodySet.has(i)) cls = "cell body";
    else if (s.food.has(i)) cls = "cell food";
    cells.push(<span key={i} className={cls} />);
  }

  return (
    <div className="snake-wrap">
      <span className="dim">probably not real contributions</span>
      <div className="snake-grid">{cells}</div>
    </div>
  );
}

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

function useKonami() {
  const progress = useRef(0);
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expected = KONAMI[progress.current];
      if (key === expected) {
        progress.current += 1;
        if (progress.current === KONAMI.length) {
          progress.current = 0;
          window.dispatchEvent(new Event("trigger-matrix"));
        }
      } else {
        progress.current = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function MatrixRain({ onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);
    const chars = "01DHAIRYASHUKLAMERN{}<>/;=+-".split("");
    let raf;
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff9d";
      ctx.font = fontSize + "px monospace";
      drops.forEach((y, i) => {
        ctx.fillText(
          chars[Math.floor(Math.random() * chars.length)],
          i * fontSize,
          y * fontSize,
        );
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const timeout = setTimeout(onDone, 4500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      window.removeEventListener("resize", resize);
    };
  }, [onDone]);

  return (
    <div className="matrix-overlay">
      <canvas ref={canvasRef} className="matrix-rain" aria-hidden="true" />
      <p className="matrix-caption">
        ↑ ↑ ↓ ↓ ← → ← → B A — developer mode engaged
      </p>
    </div>
  );
}

function BuyMeChai() {
  return (
    <a className="chai-btn" href={coffee} target="_blank" rel="noreferrer">
      ☕ Buy me a chai
    </a>
  );
}

export default function App() {
  const [projects, setProjects] = useState(localProjects);
  const [pal, setPal] = useState(false);
  const hadSelection = useRef(false);
  const [muted, setMuted] = useState(
    () =>
      typeof localStorage !== "undefined" &&
      localStorage.getItem("sfx-muted") === "true",
  );
  const [matrix, setMatrix] = useState(false);
  useKonami();

  useEffect(() => {
    const onTrigger = () => setMatrix(true);
    window.addEventListener("trigger-matrix", onTrigger);
    return () => window.removeEventListener("trigger-matrix", onTrigger);
  }, []);

  const toggleMuted = () =>
    setMuted((m) => {
      localStorage.setItem("sfx-muted", String(!m));
      return !m;
    });

  useEffect(() => {
    // use DB projects when the API has any, else local data
    fetch(`${API}/api/projects`)
      .then((r) => r.json())
      .then((d) => d.length && setProjects(d))
      .catch(() => {});
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPal((p) => !p);
      }
      if (e.key === "Escape") setPal(false);
    };
    const glow = (e) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointermove", glow);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointermove", glow);
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      resumeAudio();
      if (muted) return;
      isClickable(e.target) ? playSuccess() : playError();
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [muted]);

  useEffect(() => {
  const onSelectionChange = () => {
    const sel = window.getSelection();
    const hasText = !!sel && sel.toString().trim().length > 0;
    if (hasText && !hadSelection.current && !muted) {
      resumeAudio();
      playSelect();
    }
    hadSelection.current = hasText;
  };
  document.addEventListener("selectionchange", onSelectionChange);
  return () => document.removeEventListener("selectionchange", onSelectionChange);
}, [muted]);

  return (
    <>
      <div className="glow" aria-hidden />
      <CustomCursor />
      {matrix && <MatrixRain onDone={() => setMatrix(false)} />}
      <BuyMeChai />
      <header className="nav">
        <a href="#top" className="logo">
          dhairya.stack
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n} href={`#${n}`}>
              {n}
            </a>
          ))}
          <button onClick={() => setPal(true)} className="kbd">
            {MOD} K
          </button>
          <button
            onClick={toggleMuted}
            className="kbd"
            aria-pressed={muted}
            title="Toggle click sounds"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <ThemeSwitcher />
        </nav>
      </header>
      <main id="top">
        <section className="hero">
          <FloatIcons />
          <div className="hero-copy">
            <p className="avail">
              <span /> Available for freelance and full-time roles
            </p>
            <h1>I build web apps and ship Android at LinkedIn scale.</h1>
            <p className="lead">{me.about}</p>
            <div className="cta">
              <a className="btn" href="#projects">
                See my work
              </a>
              <a
                className="btn ghost"
                href={me.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="btn ghost"
                href={me.linkedin}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>
          <Terminal />
        </section>
        <dl className="now">
          {now.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <Marquee items={strengths} />

        <Section id="about" title="About">
          <p className="lead">
            I like backends that respond quickly and interfaces that feel
            obvious. I optimize queries before I add caches, and I write the
            boring parts (validation, error states, deploy config) properly. A
            B.Tech in Computer Science from Arya College, Jaipur (
            {education.cgpa}) gave me the fundamentals; HackerRank, NPTEL and
            IIT Bombay courses sharpened them.
          </p>
          <ul className="chips">
            {education.certs.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Section>

        <Section id="approach" title="What I do & how I work">
          <div className="approach">
            <ApproachList title="What I do" items={whatIDo} />
            <ApproachList title="How I work" items={howIWork} />
          </div>
        </Section>

        <Section id="experience" title="Experience">
          <div className="timeline">
            {jobs.map((j) => (
              <article key={j.role}>
                <div className="when">{j.when}</div>
                <div>
                  <h3>
                    {j.role}, {j.org}
                  </h3>
                  <ul>
                    {j.pts.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section id="projects" title="Projects">
          <div className="grid">
            {projects.map((p) => (
              <article className="card" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <ul className="chips">
                  {p.stack?.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="links">
                  {p.live && p.live !== "#" && (
                    <a href={p.live} target="_blank" rel="noreferrer">
                      Live demo
                    </a>
                  )}
                  {p.github && p.github !== "#" && (
                    <a href={p.github} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section id="skills" title="Skills">
          <div className="skills">
            {Object.entries(skills).map(([k, v]) => (
              <div key={k}>
                <h3>{k}</h3>
                <ul className="chips">
                  {v.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="contact" title="Let's talk">
          <p className="lead">
            Hiring, freelancing or just curious? Write to me here or at{" "}
            {me.email}.
          </p>
          <div className="contact-grid">
            <div>
              <QuickReach />
              <Contact />
            </div>
            <ProfileCards />
          </div>
        </Section>
      </main>
      <footer className="site-footer">
        <p>
          &copy; {new Date().getFullYear()} {me.name}. Built with React &
          Express.
        </p>
        <button className="back-to-top" onClick={() => go("top")}>
          Back to top &uarr;
        </button>
      </footer>
      <KeyHint onOpen={() => setPal(true)} />
      <Palette open={pal} close={() => setPal(false)} />
    </>
  );
}
