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

// ─── Token Secrets & Expirations ───────────────────────────────────────────────
const ACCESS_TOKEN_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY  = "15m";       // short-lived
const REFRESH_TOKEN_EXPIRY = "7d";        // long-lived

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
mongoose.connect(process.env.MONGO_URI);
mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
mongoose.connection.once("open", () =>
  console.log("✅ MongoDB connected")
);

// ─── Mongoose Models ──────────────────────────────────────────────────────────
// POWUser model (with role)
const userSchema = new mongoose.Schema({
  wallet:       { type: String, unique: true, required: true },
  displayName:  { type: String, required: true, immutable: true },
  role:         { type: String, enum: ["employer","worker"], required: true },
  createdAt:    { type: Date, default: Date.now },
});
const POWUser = mongoose.model("POWUser", userSchema);

// POWJob model
const jobSchema = new mongoose.Schema({
  paymentType:     { type: String, enum: ["WEEKLY","ONE_OFF"], required: true },
  jobName:         { type: String, required: true },
  jobDescription:  { type: String, required: true },
  jobTags:         { type: [String], default: [] },
  employerAddress: { type: String, required: true },
  employeeAddress: { type: String, default: null },
  status:          { type: String, enum: ["OPEN","IN_PROGRESS","FINISHED"], default: "OPEN" },
  createdAt:       { type: Date, default: Date.now },
});
const POWJob = mongoose.model("POWJob", jobSchema);

// POWMessage model (dispute messaging)
const messageSchema = new mongoose.Schema({
  disputeId:  { type: Number, required: true, index: true },
  sender:     { type: String, required: true },
  content:    { type: String, required: true },
  createdAt:  { type: Date, default: Date.now },
});
// TTL index: expire after 14 days
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 14 * 24 * 3600 }
);
const POWMessage = mongoose.model("POWMessage", messageSchema);

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
// In-memory challenge store
const challenges = new Map();

// 1. Request a challenge
app.post("/api/auth/challenge", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });
  const challenge = `ProofOfWork login: ${Date.now()}|${Math.random()}`;
  const expires  = Date.now() + (parseInt(process.env.CHALLENGE_EXPIRY_MIN)||10)*60_000;
  challenges.set(wallet.toLowerCase(), { challenge, expires });
  res.json({ challenge });
});

// 2. Verify signature → issue Access & Refresh Tokens
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { wallet, signature, displayName, role } = req.body;
    if (!wallet || !signature) 
      return res.status(400).json({ error: "Missing wallet or signature" });

    const record = challenges.get(wallet.toLowerCase());
    if (!record || record.expires < Date.now())
      return res.status(401).json({ error: "Challenge expired" });

    const signer = ethers.verifyMessage(record.challenge, signature);
    if (signer.toLowerCase() !== wallet.toLowerCase())
      throw new Error("Invalid signature");

    // Create user if new (require displayName & role)
    let user = await POWUser.findOne({ wallet });
    if (!user) {
      if (!displayName || !role)
        return res.status(400).json({ error: "displayName and role required" });
      user = await POWUser.create({ wallet, displayName, role });
    }

    // Issue tokens
    const accessToken  = jwt.sign(
      { wallet, role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign(
      { wallet, role: user.role },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    res.json({ accessToken, refreshToken });
  } catch (e) {
    console.error("Auth error:", e);
    res.status(401).json({ error: "Auth failed", details: e.message });
  }
});

// 3. Refresh Access Token
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token required" });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const newAccessToken = jwt.sign(
      { wallet: payload.wallet, role: payload.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    res.json({ accessToken: newAccessToken });
  } catch (e) {
    console.error("Refresh error:", e);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// 4. Middleware to verify Access Token
function requireAuth(req, res, next) {
  const auth = req.headers.authorization?.split(" ");
  if (auth?.[0] !== "Bearer" || !auth[1])
    return res.status(401).json({ error: "Missing access token" });
  try {
    const payload = jwt.verify(auth[1], ACCESS_TOKEN_SECRET);
    req.user = payload; // { wallet, role }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
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

// ─── Job Endpoints ─────────────────────────────────────────────────────────────
// Create a new job (employers only)
app.post("/api/jobs", requireAuth, async (req, res) => {
  if (req.user.role !== "employer")
    return res.status(403).json({ error: "Only employers can create jobs" });

  const { paymentType, jobName, jobDescription, jobTags } = req.body;
  if (!paymentType || !jobName || !jobDescription)
    return res.status(400).json({ error: "Missing required fields" });

  const job = await POWJob.create({
    paymentType,
    jobName,
    jobDescription,
    jobTags: jobTags || [],
    employerAddress: req.user.wallet
  });

  res.status(201).json(job);
});

// Update a job: assign employee or finish
app.put("/api/jobs/:jobId", requireAuth, async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  // Only employer can assign employee
  if (req.body.employeeAddress) {
    if (req.user.role !== "employer" || job.employerAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to assign" });
    job.employeeAddress = req.body.employeeAddress;
    job.status = "IN_PROGRESS";
  }
  // Only assigned employee can mark finished
  if (req.body.finish === true) {
    if (req.user.role !== "worker" || job.employeeAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to finish" });
    job.status = "FINISHED";
  }

  await job.save();
  res.json(job);
});

// List all jobs (public)
app.get("/api/jobs", async (req, res) => {
  const jobs = await POWJob.find();
  res.json(jobs);
});

// Get single job
app.get("/api/jobs/:jobId", async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(job);
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
  io.to(`dispute_${disputeId}`).emit("newMessage", msg);
  res.json(msg);
});

// Get messages for a dispute
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
  socket.on("joinRoom", (disputeId) => {
    socket.join(`dispute_${disputeId}`);
  });
  socket.on("sendMessage", (msg) => {
    if (msg.disputeId && msg.content && msg.sender) {
      io.to(`dispute_${msg.disputeId}`).emit("newMessage", msg);
    }
  });
});

// ─── Healthcheck & Start ──────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("🔥 ProofOfWork API is live!"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 Listening on port ${PORT}`));
