require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Thư viện tạo thẻ VIP

const app = express();
app.use(cors());
app.use(express.json());

// 1. KẾT NỐI MONGODB 
// (Lưu ý: Đảm bảo biến trên Render của bạn tên là MONGODB_URI hoặc MONGO_URI nhé)
const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI;
mongoose.connect(dbURI)
    .then(() => console.log('=> DATABASE CONNECTED: [MONGODB ATLAS]'))
    .catch(err => console.error('=> DATABASE ERROR:', err));

// 2. ĐỊNH NGHĨA MODEL TRỰC TIẾP
const Writeup = mongoose.model('Writeup', new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, required: true },
    type: { type: String, required: true },
    tags: [String],
    date: { type: String, required: true }
}));

// ==========================================
// [ĐÃ BỔ SUNG] 2.5 API LẤY DANH SÁCH BÀI VIẾT (Dành cho trang chủ)
// ==========================================
app.get('/api/writeups', async (req, res) => {
    try {
        // Lấy toàn bộ bài viết, .sort({ _id: -1 }) để đẩy bài mới nhất lên đầu tiên
        const writeups = await Writeup.find().sort({ _id: -1 });
        res.status(200).json(writeups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. API ĐĂNG NHẬP (CẤP TOKEN)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // So sánh với cấu hình trên Render
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        // Cấp Token có thời hạn 12 giờ
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

// 4. MÁY QUÉT BẢO VỆ (MIDDLEWARE)
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy phần <token> sau chữ Bearer
    
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Forbidden - Token giả mạo hoặc hết hạn" });
        req.user = user;
        next(); // Hợp lệ -> Cho đi tiếp vào Database
    });
};

// 5. ÁP DỤNG BẢO VỆ VÀO API THÊM BÀI
app.post('/api/writeups', verifyAdmin, async (req, res) => {
    try {
        const newWu = new Writeup(req.body);
        await newWu.save();
        res.status(201).json(newWu);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.delete('/api/writeups/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedWu = await Writeup.findByIdAndDelete(id);
        
        if (!deletedWu) {
            return res.status(404).json({ error: "Không tìm thấy bài viết để xóa!" });
        }
        
        res.status(200).json({ message: "Đã xóa bài viết thành công khỏi Database!" });
    } catch (e) {
        res.status(500).json({ error: "Lỗi Server khi thực hiện lệnh xóa" });
    }
});
// ==========================================
// [ĐÃ BỔ SUNG] 6. KHỞI ĐỘNG SERVER
// ==========================================
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`=> BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
});