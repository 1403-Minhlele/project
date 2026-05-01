const mongoose = require('mongoose');

// Định nghĩa khung xương (Schema) cho 1 bài Writeup
const writeupSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, required: true },
    type: { type: String, default: 'HackMD' },
    tags: { type: [String], default: [] },
    date: { type: String, default: () => new Date().toLocaleDateString('vi-VN') }
}, { 
    timestamps: true // Tự động thêm ngày tạo (createdAt)
});

// Xuất model ra để file server.js sử dụng
module.exports = mongoose.model('Writeup', writeupSchema);