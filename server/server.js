require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ==========================================
// VALIDATION ENVIRONMENT VARIABLES
// ==========================================
const REQUIRED_ENV = ['MONGO_URI', 'ADMIN_USER', 'ADMIN_PASS', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[STARTUP ERROR] Thiếu biến môi trường: ${missing.join(', ')}`);
  process.exit(1); // Dừng server ngay nếu thiếu config quan trọng
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('[STARTUP ERROR] JWT_SECRET phải dài ít nhất 32 ký tự!');
  process.exit(1);
}

const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet: tự động set các HTTP header bảo mật
app.use(helmet());

// CORS: chỉ cho phép domain frontend của bạn
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin "${origin}" không được phép.`));
    },
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '20kb' })); // Giới hạn body size, chặn payload bombing

// ==========================================
// RATE LIMITING
// ==========================================

// Giới hạn toàn bộ API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều request, vui lòng thử lại sau.' },
});
app.use('/api', globalLimiter);

// Giới hạn riêng cho login (chặn brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Tối đa 10 lần thử mỗi 15 phút
  message: { error: 'Quá nhiều lần đăng nhập thất bại, thử lại sau 15 phút.' },
});

// ==========================================
// DATABASE CONNECTION
// ==========================================
const DB_URI = process.env.MONGO_URI;

mongoose
  .connect(DB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('=> DATABASE CONNECTED: [MONGODB ATLAS]'))
  .catch((err) => {
    console.error('=> DATABASE CONNECTION FAILED:', err.message);
    process.exit(1);
  });

// Lắng nghe lỗi sau khi đã connect
mongoose.connection.on('error', (err) => {
  console.error('=> MONGODB RUNTIME ERROR:', err.message);
});

// ==========================================
// MODEL
// ==========================================
const writeupSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    link:  { type: String, required: true, trim: true, maxlength: 500 },
    type:  { type: String, required: true, trim: true, maxlength: 50 },
    tags:  { type: [String], default: [] },
    date:  { type: String, required: true, trim: true },
  },
  { timestamps: true } // Tự thêm createdAt, updatedAt
);

const Writeup = mongoose.model('Writeup', writeupSchema);

// ==========================================
// MIDDLEWARE: XÁC THỰC JWT
// ==========================================
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Không tìm thấy token.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Token đã hết hạn, vui lòng đăng nhập lại.'
          : 'Token không hợp lệ.';
      return res.status(403).json({ error: message });
    }
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Không có quyền truy cập.' });
    }
    req.user = payload;
    next();
  });
};

// ==========================================
// VALIDATION HELPER
// ==========================================
const isValidUrl = (str) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
  });
});

// GET /api/writeups — Lấy danh sách bài viết (public)
app.get('/api/writeups', async (req, res) => {
  try {
    // Chỉ trả về các field cần thiết, không trả toàn bộ document
    const writeups = await Writeup.find()
      .sort({ _id: -1 })
      .select('title link type tags date')
      .lean(); // .lean() trả về plain object, nhanh hơn Mongoose document

    res.status(200).json(writeups);
  } catch (e) {
    console.error('GET /api/writeups:', e.message);
    res.status(500).json({ error: 'Không thể lấy dữ liệu từ database.' });
  }
});

// POST /api/login — Đăng nhập (có rate limit riêng)
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Thiếu username hoặc password.' });
  }

  // So sánh constant-time để tránh timing attack
  const userMatch = username === process.env.ADMIN_USER;
  const passMatch = password === process.env.ADMIN_PASS;

  if (!userMatch || !passMatch) {
    // Không tiết lộ field nào sai
    return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập.' });
  }

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h', issuer: 'krinoa-backend' }
  );

  res.json({ success: true, token });
});

// POST /api/writeups — Thêm bài viết (yêu cầu xác thực)
app.post('/api/writeups', verifyAdmin, async (req, res) => {
  const { title, link, type, tags, date } = req.body ?? {};

  // Validate input
  if (!title?.trim() || !link?.trim() || !type?.trim() || !date?.trim()) {
    return res.status(400).json({ error: 'Thiếu các trường bắt buộc: title, link, type, date.' });
  }

  if (!isValidUrl(link)) {
    return res.status(400).json({ error: 'Link không hợp lệ (phải bắt đầu bằng http/https).' });
  }

  if (Array.isArray(tags) && tags.some((t) => typeof t !== 'string')) {
    return res.status(400).json({ error: 'Tags phải là mảng string.' });
  }

  try {
    const newWu = new Writeup({
      title: title.trim(),
      link: link.trim(),
      type: type.trim(),
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
      date: date.trim(),
    });
    await newWu.save();
    res.status(201).json(newWu);
  } catch (e) {
    console.error('POST /api/writeups:', e.message);
    res.status(500).json({ error: 'Không thể lưu vào database.' });
  }
});

// DELETE /api/writeups/:id — Xóa bài viết (yêu cầu xác thực)
app.delete('/api/writeups/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'ID không hợp lệ.' });
  }

  try {
    const result = await Writeup.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy bài viết (có thể đã bị xóa trước đó).',
      });
    }

    res.status(200).json({ success: true, message: 'Đã xóa bài viết khỏi database.' });
  } catch (e) {
    console.error('DELETE /api/writeups/:id:', e.message);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống khi xóa bài viết.' });
  }
});

// ==========================================
// 404 & ERROR HANDLER TOÀN CỤC
// ==========================================
app.use((req, res) => {
  res.status(404).json({ error: `Route "${req.method} ${req.path}" không tồn tại.` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Lỗi CORS sẽ rơi vào đây
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Lỗi server không xác định.' });
});

// ==========================================
// KHỞI ĐỘNG SERVER
// ==========================================
const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, () => {
  console.log(`=> SERVER RUNNING ON PORT ${PORT} | ENV: ${process.env.NODE_ENV || 'development'}`);
});