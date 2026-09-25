import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
dotenv.config();
const START_TIME = Date.now();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "10kb" }));

const Message = mongoose.model(
  "Message",
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      email: {
        type: String,
        required: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/,
      },
      message: { type: String, required: true, maxlength: 2000 },
    },
    { timestamps: true },
  ),
);
const Project = mongoose.model(
  "Project",
  new mongoose.Schema({
    title: String,
    description: String,
    stack: [String],
    live: String,
    github: String,
    order: Number,
  }),
);

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.get("/api/projects", async (_, res) => {
  try {
    res.json(await Project.find().sort("order").lean());
  } catch {
    res.json([]);
  }
});
app.get('/api/status', (_, res) => {
  res.json({
    ok: true,
    dbConnected: mongoose.connection.readyState === 1,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.post(
  "/api/contact",
  rateLimit({ windowMs: 60_000, max: 5 }),
  async (req, res) => {
    try {
      await Message.create(req.body);
      res.status(201).json({ ok: true });
    } catch {
      res
        .status(400)
        .json({ error: "Enter a name, a valid email and a message." });
    }
  },
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(() =>
    console.log(
      "MongoDB not connected: contact form will fail, the rest still works",
    ),
  );
app.listen(process.env.PORT || 5000, () => console.log("API running"));
