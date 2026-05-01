const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Đảm bảo bạn đã có biến MONGODB_URI trong file .env
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ Không tìm thấy MONGODB_URI trong file .env");
  process.exit(1);
}

// 1. Kết nối tới MongoDB Atlas
mongoose.connect(uri)
  .then(() => console.log('✅ Đã kết nối MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Lỗi kết nối MongoDB:', err);
    process.exit(1);
  });

// 2. Định nghĩa lại Model Writeup (phải giống hệt trong server.js)
const Writeup = mongoose.model('Writeup', new mongoose.Schema({
  title: { type: String, required: true },
  link: { type: String, required: true },
  type: { type: String, required: true },
  tags: [String],
  date: { type: String, required: true }
}));

// 3. Hàm chính để đọc file và lưu vào DB
async function migrateData() {
  try {
    // Đọc file writeups.json của bạn (nhớ sửa đường dẫn nếu file nằm chỗ khác)
    // Giả sử file writeups.json nằm trong thư mục data (server/data/writeups.json)
    const dataPath = './data/writeups.json'; 
    
    if (!fs.existsSync(dataPath)) {
        console.error(`❌ Không tìm thấy file tại: ${dataPath}. Hãy kiểm tra lại đường dẫn!`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(dataPath);
    const writeups = JSON.parse(rawData);

    console.log(`Đã đọc được ${writeups.length} bài Writeup từ file cục bộ.`);

    // Lưu từng bài vào MongoDB
    let successCount = 0;
    for (const wu of writeups) {
      // Bỏ qua ID cũ của file JSON, MongoDB sẽ tự tạo ID mới (_id)
      const newWu = new Writeup({
        title: wu.title,
        link: wu.link,
        type: wu.type,
        tags: wu.tags,
        date: wu.date
      });
      
      await newWu.save();
      successCount++;
    }

    console.log(`🎉 Chuyển dữ liệu thành công! Đã thêm ${successCount} bài vào MongoDB.`);

  } catch (error) {
    console.error('❌ Có lỗi xảy ra trong quá trình chuyển dữ liệu:', error);
  } finally {
    // Đóng kết nối
    mongoose.connection.close();
    process.exit(0);
  }
}

// Chạy hàm
migrateData();