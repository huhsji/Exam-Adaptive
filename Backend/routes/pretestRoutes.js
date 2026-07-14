const express = require('express');
const router = express.Router();
const db = require('../db');

// ดึงรายชื่อพาร์ททั้งหมดแบบ 
router.get('/parts', async (req, res) => {
    try {
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

// ดึงโจทย์ 1 ข้อ ตามรหัสพาร์ท และ ระดับความยาก (ใช้ดึงข้อแรกของพาร์ท)
router.get('/question/:partId/:difficultyLevel', async (req, res) => {
    try {
        const { partId, difficultyLevel } = req.params;

        
        let query = `
            SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d 
            FROM questions 
            WHERE part_id = ? AND difficulty_level = ? 
            ORDER BY RAND() 
            LIMIT 1
        `;
        let [questions] = await db.execute(query, [partId, difficultyLevel]);

        if (questions.length === 0) {
            console.log(`[Lifesaver] Part ${partId} ขาดข้อสอบ Level ${difficultyLevel} ดึงเลเวลอื่นมาแทน`);
            let fallbackQuery = `
                SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d 
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

//   รับคำตอบจากผู้ใช้ ตรวจให้ คำนวณ Level ถัดไปให้ และส่งข้อต่อไปกลับไป
router.post('/answer', async (req, res) => {
    try {
        const { userId, partId, questionId, selectedOption, step, isStep1Correct } = req.body;

        //  ตรวจคำตอบที่ 
        const [qRows] = await db.execute(`SELECT correct_answer FROM questions WHERE id = ?`, [questionId]);
        if (qRows.length === 0) return res.status(404).json({ message: "Question not found" });
        
        const correct_answer = qRows[0].correct_answer;
        const isCorrect = (selectedOption === correct_answer);

        if (step === 1) {
           // กรณีเพิ่งตอบข้อ 1 เสร็จ -> คำนวณหา Level ของโจทย์ข้อ 2
            const nextLevel = isCorrect ? 4 : 2;
            
            let [nextQuestions] = await db.execute(`
                SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d 
                FROM questions 
                WHERE part_id = ? AND difficulty_level = ? 
                ORDER BY RAND() 
                LIMIT 1
            `, [partId, nextLevel]);

            if (nextQuestions.length === 0) {
                let fallbackQuery = `SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d FROM questions WHERE part_id = ? ORDER BY RAND() LIMIT 1`;
                [nextQuestions] = await db.execute(fallbackQuery, [partId]);
            }

            // ตอบกลับไปว่ายังไม่จบ (isFinished: false) พร้อมโจทย์ข้อต่อไป
            res.status(200).json({
                isFinished: false,
                nextStep: 2,
                isStep1Correct: isCorrect,
                nextQuestion: nextQuestions[0]
            });

        } else {
            // กรณีเพิ่งตอบข้อ 2 เสร็จ -> สรุป Level และบันทึกลงฐานข้อมูล
            let finalLevel = 1;
            if (isStep1Correct && isCorrect) finalLevel = 4;
            else if (isStep1Correct && !isCorrect) finalLevel = 3;
            else if (!isStep1Correct && isCorrect) finalLevel = 2;

            const saveQuery = `
                INSERT INTO user_skills (user_id, part_id, proficiency_level, last_updated) 
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                proficiency_level = VALUES(proficiency_level),
                last_updated = NOW()
            `;
            await db.execute(saveQuery, [userId, partId, finalLevel]);

           
            res.status(200).json({
                isFinished: true,
                finalLevel: finalLevel
            });
        }
    } catch (error) {
        console.error("Error processing answer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

//  บันทึกผลสอบทั้งหมดลงตาราง user_skills (ยังคงไว้ใช้สำหรับตอนกดยอมแพ้/ข้ามไปก่อน)
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

//  เช็กว่าผู้ใช้คนนี้เคยทำแบบทดสอบหรือมีข้อมูลสกิลแล้วหรือยัง
router.get('/check/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute(`
            SELECT COUNT(*) as count 
            FROM user_skills 
            WHERE user_id = ?
        `, [userId]);
        
        res.status(200).json({ hasSkills: rows[0].count > 0 });
    } catch (error) {
        console.error("Error checking user skills:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;