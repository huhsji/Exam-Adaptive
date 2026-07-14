const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

const XLSX = require('xlsx');
const fs = require('fs');

//  นำเข้า Cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

//  คอนฟิกค่า Cloudinary 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//  เปลี่ยน Storage ของภาพข้อสอบ ให้วิ่งขึ้น Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'questions', // สร้างโฟลเดอร์ชื่อ questions บนคลาวด์ให้อัตโนมัติ
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // อนุญาตเฉพาะไฟล์ภาพ
        public_id: (req, file) => {
            // ตั้งชื่อไฟล์ใหม่ให้ไม่ซ้ำกัน
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `img-${uniqueSuffix}`; 
        }
    }
});

const upload = multer({ storage: storage });

const questionUpload = upload.fields([
    { name: 'question_image', maxCount: 1 },
    { name: 'option_a_image', maxCount: 1 },
    { name: 'option_b_image', maxCount: 1 },
    { name: 'option_c_image', maxCount: 1 },
    { name: 'option_d_image', maxCount: 1 }
]);

router.post('/api/admin/questions', questionUpload, async (req, res) => {
    try {
        const { part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, correct_answer, exam_year, explanation } = req.body;

        const question_image = req.files && req.files['question_image'] ? req.files['question_image'][0].path : null;
        const option_a_image = req.files && req.files['option_a_image'] ? req.files['option_a_image'][0].path : null;
        const option_b_image = req.files && req.files['option_b_image'] ? req.files['option_b_image'][0].path : null;
        const option_c_image = req.files && req.files['option_c_image'] ? req.files['option_c_image'][0].path : null;
        const option_d_image = req.files && req.files['option_d_image'] ? req.files['option_d_image'][0].path : null;
        
        const sql = `
            INSERT INTO questions (
                part_id, difficulty_level, question_text, question_image,
                option_a, option_a_image, option_b, option_b_image,
                option_c, option_c_image, option_d, option_d_image,
                correct_answer, exam_year, explanation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            part_id, difficulty_level, question_text, question_image,
            option_a, option_a_image, option_b, option_b_image,
            option_c, option_c_image, option_d, option_d_image,
            correct_answer, exam_year, explanation
        ];

        await db.query(sql, params);

        res.status(201).json({ success: true, message: "บันทึกข้อสอบและอัปโหลดรูปภาพขึ้น Cloudinary เรียบร้อยแล้ว"});

    } catch (error) {
        console.error("Error adding questions: ", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดหลังบ้าน" });
    }
});

// API ดึงรายชื่อวิชาทั้งหมดเพื่อเอาไปทำ Dropdown
router.get('/api/admin/parts', async (req, res) => {
    try {
        const [parts] = await db.query('SELECT id, part_name, category FROM parts');
        res.status(200).json(parts);
    } catch (error) {
        console.error("Error fetching parts: ", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลวิชา" });
    }
});


const excelStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/upload/excel/';
        
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'bulk_upload_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadExcel = multer({ storage: excelStorage });

router.post('/api/admin/upload-excel', uploadExcel.single('excel_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "กรุณาแนบไฟล์ Excel" });
        }

        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const results = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;

        for (const row of results) {
            const category = row['category']?.toString().trim();
            const partName = row['part_name']?.toString().trim(); 
            const difficulty = row['difficulty_level'] || 2;
            const questionText = row['question_text']?.toString().trim();
            
            let optionA = row['option_a']?.toString().trim() || null;
            let optionB = row['option_b']?.toString().trim() || null;
            let optionC = row['option_c']?.toString().trim() || null;
            let optionD = row['option_d']?.toString().trim() || null;
            let correctAnswer = row['correct_answer']?.toString().trim() || null;
            let examYear = row['exam_year']?.toString().trim() || '2560';
            let explanation = row['explanation']?.toString().trim() || null;

            if (!questionText || !partName) continue;

            if (optionA && optionA.startsWith('[') && optionA.endsWith(']')) {
                try {
                    const parsedOptions = JSON.parse(optionA.replace(/""/g, '"')); 
                    const actualCorrectAnswer = optionB; 
                    const actualExamYear = optionC;      
                    const actualExplanation = optionD;   

                    optionA = parsedOptions[0] || null;
                    optionB = parsedOptions[1] || null;
                    optionC = parsedOptions[2] || null;
                    optionD = parsedOptions[3] || null;
                    correctAnswer = actualCorrectAnswer;
                    examYear = actualExamYear;
                    explanation = actualExplanation;
                } catch (e) {
                    continue;
                }
            }

            if (!correctAnswer) continue;

            await db.query(`INSERT IGNORE INTO parts (part_name, category) VALUES (?, ?)`, [partName, category]);
            const [partData] = await db.query(`SELECT id FROM parts WHERE part_name = ?`, [partName]);
            if (partData.length === 0) continue; 
            const partId = partData[0].id;

            await db.query(
                `INSERT INTO questions 
                (part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, correct_answer, exam_year, explanation) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [partId, difficulty, questionText, optionA, optionB, optionC, optionD, correctAnswer, examYear, explanation]
            );
            successCount++;
        }

        // ลบไฟล์ทิ้งหลังทำงานเสร็จ จะได้ไม่รกเซิร์ฟเวอร์
        fs.unlinkSync(filePath);

        res.status(200).json({ 
            success: true, 
            message: `นำเข้าข้อสอบสำเร็จทั้งหมด ${successCount} ข้อ` 
        });

    } catch (error) {
        console.error(" เกิดข้อผิดพลาดตอนนำเข้าไฟล์ Excel:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel" });
    }
});

module.exports = router;