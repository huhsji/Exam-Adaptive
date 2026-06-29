const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// สร้าง API เส้นทางแรก
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend Server is running perfectly!' });
});


// ดึง router จากไฟล์
const practiceRoutes = require('./routes/practiceRoutes')
app.use('/api/practice' , practiceRoutes);

const mockExamRoutes = require('./routes/mockExamRoutes');
app.use('/mock', mockExamRoutes);

const plannerRoutes = require('./routes/plannerRoutes'); // ปรับ path ให้ตรงโฟลเดอร์ของพี่ฮัช
app.use('/api/planner', plannerRoutes);

const adminRoutes = require('./routes/admin'); 
app.use('/', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    // 4. เปลี่ยนมาใช้เครื่องหมาย Backtick ( ` ) เพื่อให้ ${PORT} ทำงาน
    console.log(` เซิร์ฟเวอร์พร้อมทำงานที่ พอร์ต: http://localhost:${PORT}`);
});