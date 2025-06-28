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

// ─── CORS CONFIGURATION ────────────────────────────────────────────────────────
// Allow https://www.proofofworks.com (and its subdomains) plus localhost for dev
const allowedOrigins = [
  /^https:\/\/([a-zA-Z0-9-]+\.)?proofofworks\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(rx => rx.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
}));

// Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(rx => rx.test(origin))) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ─── BASIC MIDDLEWARES ─────────────────────────────────────────────────────────
app.use(express.json());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 60,
  keyGenerator: req => req.user?.wallet || req.ip,
});
app.use(limiter);

// ─── MONGODB CONNECTION ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", err => console.error("MongoDB error:", err));
mongoose.connection.once("open", () => console.log("✅ MongoDB connected"));

// ─── MONGOOSE MODELS ────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  wallet:       { type: String, unique: true, required: true },
  displayName:  { type: String, required: true, immutable: true },
  role:         { type: String, enum: ["employer", "worker"], required: true },
  createdAt:    { type: Date, default: Date.now },
});
const POWUser = mongoose.model("POWUser", userSchema);

const jobSchema = new mongoose.Schema({
  paymentType:     { type: String, enum: ["WEEKLY", "ONE_OFF"], required: true },
  jobName:         { type: String, required: true },
  jobDescription:  { type: String, required: true },
  jobTags:         { type: [String], default: [] },
  employerAddress: { type: String, required: true },
  employeeAddress: { type: String, default: null },
  status:          { type: String, enum: ["OPEN", "IN_PROGRESS", "FINISHED"], default: "OPEN" },
  createdAt:       { type: Date, default: Date.now },
});
const POWJob = mongoose.model("POWJob", jobSchema);

const taskSchema = new mongoose.Schema({
  taskName:        { type: String, required: true },
  taskDescription: { type: String, required: true },
  taskTags:        { type: [String], default: [] },
  workerAddress:   { type: String, required: true },
  status:          { type: String, enum: ["OPEN", "OFFERED", "CONVERTED"], default: "OPEN" },
  createdAt:       { type: Date, default: Date.now },
});
const POWTask = mongoose.model("POWTask", taskSchema);

const offerSchema = new mongoose.Schema({
  task:             { type: mongoose.Schema.Types.ObjectId, ref: "POWTask", required: true },
  employerAddress:  { type: String, required: true },
  workerAddress:    { type: String, required: true }, // Add this field
  status:           { type: String, enum: ["PENDING", "DECLINED", "ACCEPTED"], default: "PENDING" },
  kasAmount:        { type: String }, // Add these fields for offer details
  paymentType:      { type: String, enum: ["weekly", "oneoff"] },
  duration:         { type: String },
  createdAt:        { type: Date, default: Date.now },
});
const POWOffer = mongoose.model("POWOffer", offerSchema);

const messageSchema = new mongoose.Schema({
  disputeId:  { type: Number, required: true, index: true },
  sender:     { type: String, required: true },
  content:    { type: String, required: true },
  createdAt:  { type: Date, default: Date.now },
});
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 14 * 24 * 3600 }
);
const POWMessage = mongoose.model("POWMessage", messageSchema);

const chatSchema = new mongoose.Schema({
  participants: { type: [String], required: true, index: true },
  sender:       { type: String, required: true },
  receiver:     { type: String, required: true },
  content:      { type: String, required: true },
  createdAt:    { type: Date, default: Date.now },
});
const POWChatMessage = mongoose.model("POWChatMessage", chatSchema);

// ─── AUTH HELPERS ──────────────────────────────────────────────────────────────
const challenges = new Map();

app.post("/api/auth/challenge", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });
  const challenge = `ProofOfWork login: ${Date.now()}|${Math.random()}`;
  const expires  = Date.now() + (parseInt(process.env.CHALLENGE_EXPIRY_MIN, 10) || 10) * 60_000;
  challenges.set(wallet.toLowerCase(), { challenge, expires });
  res.json({ challenge });
});

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

    let user = await POWUser.findOne({ wallet });
    if (!user) {
      if (!displayName || !role)
        return res.status(400).json({ error: "displayName and role required" });
      user = await POWUser.create({ wallet, displayName, role });
    }

    const accessToken  = jwt.sign(
      { wallet, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { wallet, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken, refreshToken });
  } catch (e) {
    console.error("Auth error:", e);
    res.status(401).json({ error: "Auth failed", details: e.message });
  }
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token required" });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { wallet: payload.wallet, role: payload.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken: newAccessToken });
  } catch (e) {
    console.error("Refresh error:", e);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization?.split(" ");
  if (auth?.[0] !== "Bearer" || !auth[1])
    return res.status(401).json({ error: "Missing access token" });
  try {
    const payload = jwt.verify(auth[1], process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

// ─── USER ENDPOINTS ────────────────────────────────────────────────────────────
app.get("/api/users/:wallet", async (req, res) => {
  const user = await POWUser.findOne({ wallet: req.params.wallet });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});
app.head("/api/users/:wallet", async (req, res) => {
  const exists = await POWUser.exists({ wallet: req.params.wallet });
  res.sendStatus(exists ? 200 : 404);
});

// ─── JOB ENDPOINTS ─────────────────────────────────────────────────────────────
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

app.put("/api/jobs/:jobId", requireAuth, async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (req.body.employeeAddress) {
    if (req.user.role !== "employer" || job.employerAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to assign" });
    job.employeeAddress = req.body.employeeAddress;
    job.status = "IN_PROGRESS";
  }
  if (req.body.finish === true) {
    if (req.user.role !== "worker" || job.employeeAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to finish" });
    job.status = "FINISHED";
  }

  await job.save();
  res.json(job);
});

app.get("/api/jobs", async (req, res) => {
  const jobs = await POWJob.find();
  res.json(jobs);
});
app.get("/api/jobs/:jobId", async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(job);
});
app.delete("/api/jobs/:jobId", requireAuth, async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (req.user.role !== "employer" || job.employerAddress !== req.user.wallet)
    return res.status(403).json({ error: "Not authorized to delete" });
  await job.deleteOne();
  res.sendStatus(204);
});

// ─── TASK ENDPOINTS ────────────────────────────────────────────────────────────
app.post("/api/tasks", requireAuth, async (req, res) => {
  if (req.user.role !== "worker")
    return res.status(403).json({ error: "Only workers can create tasks" });

  // Limit to 3 concurrent tasks
  const activeCount = await POWTask.countDocuments({
    workerAddress: req.user.wallet,
    status: { $in: ["OPEN", "OFFERED"] }
  });
  if (activeCount >= 3)
    return res.status(400).json({ error: "Cannot have more than 3 active tasks" });

  const { taskName, taskDescription, taskTags } = req.body;
  if (!taskName || !taskDescription)
    return res.status(400).json({ error: "Missing required fields" });

  const task = await POWTask.create({
    taskName,
    taskDescription,
    taskTags: taskTags || [],
    workerAddress: req.user.wallet
  });
  res.status(201).json(task);
});

app.get("/api/tasks", async (req, res) => {
  const tasks = await POWTask.find();
  res.json(tasks);
});
app.get("/api/tasks/:taskId", async (req, res) => {
  const task = await POWTask.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});
app.delete("/api/tasks/:taskId", requireAuth, async (req, res) => {
  const task = await POWTask.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (req.user.role !== "worker" || task.workerAddress !== req.user.wallet)
    return res.status(403).json({ error: "Not authorized to delete" });
  await task.deleteOne();
  res.sendStatus(204);
});

// ─── OFFER ENDPOINTS ──────────────────────────────────────────────────────────
// Create an offer (employer → worker)
app.post("/api/tasks/:taskId/offers", requireAuth, async (req, res) => {
  if (req.user.role !== "employer")
    return res.status(403).json({ error: "Only employers can make offers" });

  const task = await POWTask.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.status !== "OPEN")
    return res.status(400).json({ error: "Task is not open for offers" });

  const offer = await POWOffer.create({
    task:            task._id,
    employerAddress: req.user.wallet,
    workerAddress:   task.workerAddress,            // ← populate
  });

  task.status = "OFFERED";
  await task.save();
  res.status(201).json(offer);
});

app.post("/api/offers/:offerId/job", requireAuth, async (req, res) => {
  const offer = await POWOffer.findById(req.params.offerId).populate("task");
  if (!offer) return res.status(404).json({ error: "Offer not found" });
  if (offer.employerAddress !== req.user.wallet)
    return res.status(403).json({ error: "Not authorized to convert this offer" });
  if (offer.status !== "PENDING")
    return res.status(400).json({ error: "Offer cannot be converted" });

  const { paymentType } = req.body;
  if (!paymentType)
    return res.status(400).json({ error: "paymentType required to create job" });

  const job = await POWJob.create({
    paymentType,
    jobName: offer.task.taskName,
    jobDescription: offer.task.taskDescription,
    jobTags: offer.task.taskTags,
    employerAddress: req.user.wallet
  });

  offer.status = "DECLINED";
  await offer.save();

  offer.task.status = "CONVERTED";
  await offer.task.save();

  res.status(201).json(job);
});

// ─── FETCH OFFERS ─────────────────────────────────────────────────────────────
app.get("/api/offers", requireAuth, async (req, res) => {
  const { employerAddress, workerAddress } = req.query;
  if (!employerAddress && !workerAddress) {
    return res.status(400).json({ error: "Provide employerAddress or workerAddress" });
  }

  const filter = {};
  if (employerAddress) filter.employerAddress = employerAddress;
  if (workerAddress)   filter.workerAddress   = workerAddress;

  try {
    const offers = await POWOffer
      .find(filter)
      .populate("task")
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (e) {
    console.error("Fetch offers error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Accept an offer (worker accepts employer's offer)
app.post("/api/offers/:offerId/accept", requireAuth, async (req, res) => {
  try {
    const offer = await POWOffer.findById(req.params.offerId).populate("task");
    
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    
    if (offer.workerAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to accept this offer" });
    
    if (offer.status !== "PENDING")
      return res.status(400).json({ error: "Offer cannot be accepted" });

    // Create job listing
    const job = await POWJob.create({
      paymentType: offer.paymentType?.toUpperCase() || "WEEKLY",
      jobName: offer.task.taskName,
      jobDescription: offer.task.taskDescription,
      jobTags: offer.task.taskTags,
      employerAddress: offer.employerAddress,
      employeeAddress: req.user.wallet, // Assign worker immediately
      status: "IN_PROGRESS"
    });

    // Update offer status
    offer.status = "ACCEPTED";
    await offer.save();

    // Update task status
    offer.task.status = "CONVERTED";
    await offer.task.save();

    res.status(201).json({ job, message: "Offer accepted and job created" });
  } catch (e) {
    console.error("Accept offer error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Decline an offer (worker declines employer's offer)
app.post("/api/offers/:offerId/decline", requireAuth, async (req, res) => {
  try {
    const offer = await POWOffer.findById(req.params.offerId).populate("task");
    
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    
    if (offer.workerAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to decline this offer" });
    
    if (offer.status !== "PENDING")
      return res.status(400).json({ error: "Offer cannot be declined" });

    // Update offer status
    offer.status = "DECLINED";
    await offer.save();

    // Reset task status to OPEN
    offer.task.status = "OPEN";
    await offer.task.save();

    res.json({ message: "Offer declined" });
  } catch (e) {
    console.error("Decline offer error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Cancel/delete an offer (employer cancels their offer)
app.delete("/api/offers/:offerId", requireAuth, async (req, res) => {
  try {
    const offer = await POWOffer.findById(req.params.offerId).populate("task");
    
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    
    if (offer.employerAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to cancel this offer" });

    // Reset task status to OPEN if it was OFFERED
    if (offer.task.status === "OFFERED") {
      offer.task.status = "OPEN";
      await offer.task.save();
    }

    // Delete the offer
    await offer.deleteOne();

    res.json({ message: "Offer cancelled successfully" });
  } catch (e) {
    console.error("Cancel offer error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── DISPUTE MESSAGING ────────────────────────────────────────────────────────
app.post("/api/messages", requireAuth, async (req, res) => {
  const { disputeId, content } = req.body;
  if (disputeId == null || !content)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const msg = await POWMessage.create({
      disputeId: Number(disputeId),
      sender:    req.user.wallet,
      content,
    });
    io.to(`dispute_${disputeId}`).emit("newMessage", msg);
    res.json(msg);
  } catch (e) {
    console.error("Message creation error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/messages/:disputeId", requireAuth, async (req, res) => {
  const page  = parseInt(req.query.page, 10)  || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const msgs  = await POWMessage.find({ disputeId: req.params.disputeId })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(msgs);
});

// ─── CHAT MESSAGING ENDPOINTS ────────────────────────────────────────────────
app.post("/api/chat/messages", requireAuth, async (req, res) => {
  const { to, content } = req.body;
  const from = req.user.wallet;
  if (!to || !content) return res.status(400).json({ error: "Missing fields: to and content required" });

  try {
    const participants = [from, to].sort();
    const chatMsg = await POWChatMessage.create({
      participants,
      sender:   from,
      receiver: to,
      content,
    });
    const room = `chat_${participants.join("_")}`;
    io.to(room).emit("newChatMessage", chatMsg);
    res.json(chatMsg);
  } catch (e) {
    console.error("Chat message creation error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/chat/messages/:peer", requireAuth, async (req, res) => {
  const peer  = req.params.peer;
  const user  = req.user.wallet;
  const page  = parseInt(req.query.page, 10)  || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const participants = [user, peer].sort();

  const msgs = await POWChatMessage.find({ participants })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json(msgs);
});

app.get("/api/chat/conversations", requireAuth, async (req, res) => {
  const user  = req.user.wallet;
  const page  = parseInt(req.query.page,  10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const userRegex = new RegExp(`^${user}$`, "i");

  try {
    const msgs = await POWChatMessage.find({
      $or: [
        { sender:   userRegex },
        { receiver: userRegex }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(msgs);
  } catch (e) {
    console.error("Error fetching user conversations:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("WS connected:", socket.id);

  socket.on("joinRoom", (id) => socket.join(`dispute_${id}`));
  socket.on("sendMessage", (msg) => {
    if (msg.disputeId && msg.content && msg.sender) {
      io.to(`dispute_${msg.disputeId}`).emit("newMessage", msg);
    }
  });

  socket.on("joinChat", ({ me, peer }) => {
    const participants = [me, peer].sort();
    socket.join(`chat_${participants.join("_")}`);
  });
  socket.on("sendChatMessage", async (data) => {
    const { sender, to, content } = data;
    if (!sender || !to || !content) return;
    const participants = [sender, to].sort();
    try {
      const chatMsg = await POWChatMessage.create({
        participants,
        sender,
        receiver: to,
        content,
      });
      const room = `chat_${participants.join("_")}`;
      io.to(room).emit("newChatMessage", chatMsg);
    } catch (e) {
      console.error("Socket chat error:", e);
    }
  });
});

// ─── HEALTHCHECK & START ──────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("🔥 ProofOfWork API is live!"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 Listening on port ${PORT}`));
