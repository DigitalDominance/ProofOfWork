// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const rateLimit = require("express-rate-limit");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ─── Basic Middlewares ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Rate limiting per wallet (or IP)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 60,
  keyGenerator: (req) => req.user?.wallet || req.ip,
});
app.use(limiter);

// ─── MongoDB Connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
mongoose.connection.once("open", () =>
  console.log("✅ MongoDB connected")
);

// ─── Mongoose Models ──────────────────────────────────────────────────────────
// POWUser model
const userSchema = new mongoose.Schema({
  wallet: { type: String, unique: true, required: true },
  displayName: { type: String, required: true, immutable: true },
  createdAt: { type: Date, default: Date.now },
});
const POWUser = mongoose.model("POWUser", userSchema);

// POWMessage model (dispute messaging)
const messageSchema = new mongoose.Schema({
  disputeId: { type: Number, required: true, index: true },
  sender: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});
// TTL index: expire 14 days after creation
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 14 * 24 * 3600 }
);
const POWMessage = mongoose.model("POWMessage", messageSchema);

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
// In-memory challenge store: { [wallet]: { msg, expires } }
const challenges = new Map();

// 1. Request a challenge
app.post("/api/auth/challenge", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });

  const challenge = `ProofOfWork login: ${Date.now()}|${Math.random()}`;
  const expires =
    Date.now() + (parseInt(process.env.CHALLENGE_EXPIRY_MIN) || 10) * 60_000;

  challenges.set(wallet.toLowerCase(), { challenge, expires });
  res.json({ challenge });
});

// 2. Verify signature → issue JWT
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { wallet, signature, displayName } = req.body;
    if (!wallet || !signature)
      return res.status(400).json({ error: "Missing params" });

    const record = challenges.get(wallet.toLowerCase());
    if (!record || record.expires < Date.now())
      return res.status(401).json({ error: "Challenge expired" });

    const signer = ethers.verifyMessage(record.challenge, signature);
    if (signer.toLowerCase() !== wallet.toLowerCase())
      throw new Error("Invalid signature");

    // Issue JWT
    const token = jwt.sign({ wallet }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create user if not exists (first‐time set displayName)
    let user = await POWUser.findOne({ wallet });
    if (!user) {
      if (!displayName)
        return res.status(400).json({ error: "displayName required" });
      user = await POWUser.create({ wallet, displayName });
    }

    res.json({ token });
  } catch (e) {
    console.error("Auth error:", e);
    res.status(401).json({ error: "Auth failed", details: e.message });
  }
});

// 3. Middleware to verify JWT
function requireAuth(req, res, next) {
  const auth = req.headers.authorization?.split(" ");
  if (auth?.[0] !== "Bearer" || !auth[1])
    return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(auth[1], process.env.JWT_SECRET);
    req.user = payload; // { wallet }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ─── User Endpoints ────────────────────────────────────────────────────────────
// Get user by wallet
app.get("/api/users/:wallet", async (req, res) => {
  const user = await POWUser.findOne({ wallet: req.params.wallet });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});
// Check if exists
app.head("/api/users/:wallet", async (req, res) => {
  const exists = await POWUser.exists({ wallet: req.params.wallet });
  res.sendStatus(exists ? 200 : 404);
});

// ─── Dispute Messaging Endpoints ──────────────────────────────────────────────
// Post a new message
app.post("/api/messages", requireAuth, async (req, res) => {
  const { disputeId, content } = req.body;
  if (disputeId == null || !content)
    return res.status(400).json({ error: "Missing fields" });

  const msg = await POWMessage.create({
    disputeId,
    sender: req.user.wallet,
    content,
  });
  // Emit to WebSocket room
  io.to(`dispute_${disputeId}`).emit("newMessage", msg);
  res.json(msg);
});

// Get messages for a dispute (paginated)
app.get("/api/messages/:disputeId", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const msgs = await POWMessage.find({ disputeId: req.params.disputeId })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(msgs);
});

// ─── WebSockets ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("WS connected:", socket.id);

  // Join a dispute room to get live updates
  socket.on("joinRoom", (disputeId) => {
    socket.join(`dispute_${disputeId}`);
  });

  // Optionally handle direct WS messages from client
  socket.on("sendMessage", (msg) => {
    if (msg.disputeId && msg.content && msg.sender) {
      io.to(`dispute_${msg.disputeId}`).emit("newMessage", msg);
    }
  });
});

// ─── Healthcheck & Start ──────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("🔥 ProofOfWork API is live!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 Listening on port ${PORT}`));
