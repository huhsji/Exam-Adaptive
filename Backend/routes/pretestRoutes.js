const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. API: ดึงรายชื่อพาร์ททั้งหมดแบบ 
router.get('/parts', async (req, res) => {
    try {
        // เพิ่ม WHERE category != 'Mock Exam' เพื่อไม่ให้โหมดจำลองสอบหลุดเข้ามาใน Pre-test
        const [parts] = await db.execute(`
            SELECT id, part_name, category 
            FROM parts 
            WHERE category != 'Mock Exam' 
            ORDER BY id ASC
        `);
        res.status(200).json(parts);
    } catch (error) {
        console.error("Error fetching parts:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 2. API: ดึงโจทย์ 1 ข้อ ตามรหัสพาร์ท และ ระดับความยาก
router.get('/question/:partId/:difficultyLevel', async (req, res) => {
    try {
        const { partId, difficultyLevel } = req.params;

        // 1. ลองหาข้อสอบตรงตาม Level ที่ขอมาก่อน
        let query = `
            SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, correct_answer 
            FROM questions 
            WHERE part_id = ? AND difficulty_level = ? 
            ORDER BY RAND() 
            LIMIT 1
        `;
        let [questions] = await db.execute(query, [partId, difficultyLevel]);

        // 2.  THE LIFESAVER: ถ้าเลเวลที่ขอไม่มีในฐานข้อมูล (เช่น ขอ Level 3 แต่ DB มีแค่ Level 1)
        // ให้กวาดหา "ข้อสอบเลเวลอะไรก็ได้" ในพาร์ทนั้นมาให้ User ทำแทน หน้าจอจะได้ไม่ค้าง
        if (questions.length === 0) {
            console.log(`[Lifesaver] Part ${partId} ขาดข้อสอบ Level ${difficultyLevel} ดึงเลเวลอื่นมาแทน`);
            let fallbackQuery = `
                SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, correct_answer 
                FROM questions 
                WHERE part_id = ? 
                ORDER BY RAND() 
                LIMIT 1
            `;
            [questions] = await db.execute(fallbackQuery, [partId]);
        }

        if (questions.length === 0) {
            return res.status(404).json({ message: "No question found for this part at all" });
        }

        res.status(200).json(questions[0]);
    } catch (error) {
        console.error("Error fetching question:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 3. API: บันทึกผลสอบทั้งหมดลงตาราง user_skills
router.post('/submit', async (req, res) => {
    try {
        const { userId, results } = req.body; 

        for (const result of results) {
            const query = `
                INSERT INTO user_skills (user_id, part_id, proficiency_level, last_updated) 
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                proficiency_level = VALUES(proficiency_level),
                last_updated = NOW()
            `;
            await db.execute(query, [userId, result.partId, result.level]);
        }

        res.status(200).json({ message: "Pre-test results saved successfully" });
    } catch (error) {
        console.error("Error saving pretest results:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;