const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET_KEY = process.env.JWT_SECRET; 

//  API: สมัครสมาชิก (Register)
router.post('/register', async (req, res) => {
    try {
        //  [แก้ไข 1] เพิ่มการรับค่า education_level จากหน้าบ้าน
        const { name, email, password, education_level } = req.body;
        
        // เช็กว่ากรอกข้อมูลครบไหม
        if (!name || !email || !password || !education_level) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const [existingUsers] = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "อีเมลนี้มีในระบบแล้ว กรุณาล็อกอิน" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        //  [แก้ไข 2] เพิ่ม education_level ลงในคำสั่ง SQL INSERT
        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash, education_level, created_at) VALUES (?, ?, ?, ?, NOW())`,
            [name, email, passwordHash, education_level]
        );

        res.status(201).json({ message: "สมัครสมาชิกสำเร็จ! กรุณาล็อกอิน", user_id: result.insertId });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการสมัครสมาชิก" });
    }
});

//  API: ล็อกอิน (Login)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });

        // 1. ค้นหา User จาก Email
        const [users] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: "ไม่พบอีเมลนี้ในระบบ" });
        }

        const user = users[0];

        // 2. ตรวจสอบรหัสผ่านที่เข้ารหัสไว้
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
        }

        // 3. สร้างบัตรผ่าน JWT Token
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1d' });

        //  [แก้ไข] เพิ่มการส่งค่า user.role กลับไปให้ React หน้าบ้านนำไปเช็กสิทธิ์
        res.json({
            message: "ล็อกอินสำเร็จ",
            token: token,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                role: user.role 
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการล็อกอิน" });
    }
});

module.exports = router;