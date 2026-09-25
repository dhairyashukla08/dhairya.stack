import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { DEFAULT_THEME } from "./themes.js";
const saved = localStorage.getItem("theme") || DEFAULT_THEME;
document.documentElement.setAttribute("data-theme", saved);
createRoot(document.getElementById("root")).render(<App />);
