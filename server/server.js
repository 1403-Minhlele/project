require('dotenv').config(); // [MỚI] Load mật khẩu từ file .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // [MỚI] Thư viện MongoDB
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit');
const { handleSecureContact } = require('./contactHandler');
const Writeup = require('./models/Writeup'); // [MỚI] Nhập khuôn mẫu dữ liệu

const app = express();

// --- BẢO MẬT ---
app.use(helmet());
app.use(cors());
app.use(express.json());

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

// --- [MỚI] KẾT NỐI MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 ĐÃ KẾT NỐI THÀNH CÔNG TỚI MONGODB CLOUD!"))
    .catch((err) => console.error("🔴 LỖI KẾT NỐI MONGODB:", err));

// ==========================================
// API 1: LẤY DỮ LIỆU TỪ MONGODB (GET)
// ==========================================
app.get('/api/writeups', async (req, res) => {
    try {
        // Tìm tất cả bài viết, sắp xếp theo thời gian mới nhất
        const writeups = await Writeup.find().sort({ createdAt: -1 });
        res.status(200).json(writeups);
    } catch (err) {
        res.status(500).json({ error: "Lỗi kéo dữ liệu từ DB" });
    }
});

// ==========================================
// API 2: LƯU BÀI VIẾT MỚI VÀO MONGODB (POST)
// ==========================================
app.post('/api/writeups', async (req, res) => {
    try {
        // Tạo một bài viết mới dựa trên dữ liệu React gửi lên
        const newWriteup = new Writeup(req.body);
        
        // Lưu thẳng lên MongoDB Cloud
        await newWriteup.save(); 
        
        res.status(201).json({ message: "Đã lưu vĩnh viễn vào MongoDB!" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi lưu dữ liệu" });
    }
});

// --- API LIÊN HỆ ---
app.post('/api/contact', contactLimiter, handleSecureContact);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`=> BACKEND SERVER ĐANG CHẠY TẠI CỔNG ${PORT}`);
});