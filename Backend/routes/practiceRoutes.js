const express = require('express');
const router = express.Router();
const db = require('../db');

//  ดึงรายชื่อหมวดวิชาหลัก พร้อมคำนวณ % ความคืบหน้าของผู้ใช้
router.get('/categories', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: "กรุณาส่ง user_id มาด้วยครับ" });
        }

        //  ดึงวุฒิการศึกษาของผู้ใช้
        const [[userInfo]] = await db.query(`SELECT education_level FROM users WHERE id = ?`, [user_id]);
        
        // บังคับเช็กวุฒิ: ถ้าไม่มีข้อมูลในฐานข้อมูล ให้โยน Error 
        if (!userInfo || !userInfo.education_level) {
            return res.status(400).json({ error: "ไม่พบข้อมูลวุฒิการศึกษาของผู้ใช้ กรุณาตรวจสอบข้อมูลในระบบ" });
        }
        
        const userEdu = userInfo.education_level;

        //  ดึงหมวดวิชา นับจำนวนพาร์ท และรวมคะแนนสะสมทั้งหมดของผู้ใช้คนนี้
        const [categoriesData] = await db.query(`
            SELECT 
                p.category, 
                COUNT(p.id) as total_parts,
                SUM(IFNULL(us.accumulated_score, 0)) as total_user_score
            FROM parts p
            LEFT JOIN user_skills us ON p.id = us.part_id AND us.user_id = ?
            WHERE p.category IS NOT NULL AND p.category != ''
            GROUP BY p.category
        `, [user_id]);

        //  นำข้อมูลมาคำนวณเปอร์เซ็นต์และเกณฑ์การผ่าน
        const result = categoriesData.map(row => {
            const maxScore = row.total_parts * 100; // เช่น 18 พาร์ท = 1800 คะแนนเต็ม
            const currentPercentage = maxScore > 0 ? Math.floor((row.total_user_score / maxScore) * 100) : 0;

            // ลอจิกคำนวณเป้าหมาย (เกณฑ์ผ่าน ก.พ.)
            let passingCriteria = 60; // ตั้งค่าพื้นฐานไว้ที่ 60 ก่อน

            if (row.category === 'วิชาภาษาอังกฤษ') {
                passingCriteria = 50; // อังกฤษ 50% เท่ากันทุกวุฒิ
            } else if (row.category === 'วิชาความรู้และลักษณะการเป็นข้าราชการที่ดี') {
                passingCriteria = 60; // ข้าราชการที่ดี 60% เท่ากันทุกวุฒิ
            } else if (row.category === 'วิชาความรู้ความสามารถในการคิดวิเคราะห์') {
                // คิดวิเคราะห์: ป.โท 65% / ส่วน ปวช, ปวส, ป.ตรี คือ 60% 
                if (userEdu === 'ป.โท') {
                    passingCriteria = 65;
                } else {
                    passingCriteria = 60;
                }
            }

            return {
                name: row.category,
                percentage: currentPercentage,
                passing_criteria: passingCriteria,
                total_parts: row.total_parts
            };
        });

        res.json(result);

    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการดึงหมวดวิชา" });
    }
});

//ดึงรายชื่อพาร์ทย่อยตามหมวดวิชา (Parts by Category)
router.get('/parts', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) return res.status(400).json({ error: "กรุณาส่งชื่อหมวดวิชา (category) มาด้วย" });

        const [parts] = await db.query(`SELECT id, part_name, category FROM parts WHERE category = ?`, [category]);
        res.json(parts);
    } catch (error) {
        console.error("Error fetching parts:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการดึงพาร์ทวิชา" });
    }
});
    
// สร้างรอบการสอบ (รับเป็น part_id แทน)
router.post('/start', async (req, res) => {
    try {
        const { user_id, part_id } = req.body;

        if (!user_id || !part_id) {
            return res.status(400).json({ error: "กรุณาส่ง user_id และ part_id มาด้วย" });
        }

        const [result] = await db.query(
            `INSERT INTO exam_sessions (user_id, session_type) VALUES (?, ?)`,
            [user_id, `practice_part_${part_id}`]
        );

        res.json({
            message: "สร้างรอบการสอบแบบ MST สำเร็จ",
            session_id: result.insertId,
            total_questions: 20
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเริ่มสอบ:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

// 2. API โหมดฝึกทำ: ดึงข้อสอบ (รับเป็น part_id แทน)
router.get('/question', async (req, res) => {
    try {
        const { user_id, part_id, session_id } = req.query;

        if (!user_id || !part_id || !session_id) {
            return res.status(400).json({ error: "กรุณาส่งข้อมูลมาให้ครบ (user_id, part_id, session_id)" });
        }

        const partIdNum = parseInt(part_id); // แปลงเป็นตัวเลขชัวร์ๆ

        // 1. ดึงประวัติการตอบในรอบนี้
        const [answers] = await db.query(`
            SELECT ua.user_answer, q.correct_answer 
            FROM user_answers ua
            JOIN questions q ON ua.question_id = q.id
            WHERE ua.session_id = ?
            ORDER BY ua.answered_at ASC
        `, [session_id]);

        const answeredCount = answers.length;
        if (answeredCount >= 20) {
            return res.json({ is_finished: true, message: "สอบครบ 20 ข้อแล้วครับ" });
        }

        // 2. ดึงค่าความเก่งตั้งต้น
        let [skills] = await db.query(`SELECT proficiency_level FROM user_skills WHERE user_id = ? AND part_id = ?`, [user_id, partIdNum]);
        let targetLevel = (skills.length > 0 && skills[0].proficiency_level > 0) ? parseInt(skills[0].proficiency_level, 10) : 3;

        // 3. ลอจิก MST (แบ่งด่านประมวลผล)
        let currentStage = 1;

        if (answeredCount >= 7) {
            currentStage = 2;
            let stage1Correct = answers.slice(0, 7).filter(a => {
                const userAns = a.user_answer.trim();
                const corrAns = a.correct_answer.trim();
                return userAns.startsWith(corrAns) || userAns === corrAns;
            }).length;

            if (stage1Correct >= 6) targetLevel = Math.min(targetLevel + 1, 5); 
            else if (stage1Correct <= 3) targetLevel = Math.max(targetLevel - 1, 1);
        }

        if (answeredCount >= 14) {
            currentStage = 3;
            let stage2Correct = answers.slice(7, 14).filter(a => {
                const userAns = a.user_answer.trim();
                const corrAns = a.correct_answer.trim();
                return userAns.startsWith(corrAns) || userAns === corrAns;
            }).length;

            if (stage2Correct >= 6) targetLevel = Math.min(targetLevel + 1, 5);
            else if (stage2Correct <= 3) targetLevel = Math.max(targetLevel - 1, 1);
        }

        // 4. สุ่มดึงข้อสอบ
        // ดึงฟิลด์ question_image และ option_a_image ถึง D ออกมาด้วย
        const [questions] = await db.query(`
            SELECT id, part_id, difficulty_level, question_text, question_image,
                   option_a, option_b, option_c, option_d,
                   option_a_image, option_b_image, option_c_image, option_d_image,
                   exam_year 
            FROM questions 
            WHERE part_id = ? AND difficulty_level = ? 
            AND id NOT IN (SELECT question_id FROM user_answers WHERE session_id = ?)
            ORDER BY RAND() LIMIT 1
        `, [partIdNum, targetLevel, session_id]);

        if (questions.length === 0) {
            return res.status(404).json({ error: `ตะกร้าข้อสอบ Level ${targetLevel} ของหมวดนี้หมดชั่วคราวครับ` });
        }

        const q = questions[0];
        
        // จัดฟอร์แมตช้อยส์ให้มีรูปภาพติดไปด้วย
        q.options = [
            { text: q.option_a, image: q.option_a_image },
            { text: q.option_b, image: q.option_b_image },
            { text: q.option_c, image: q.option_c_image },
            { text: q.option_d, image: q.option_d_image }
        ];
        delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
        delete q.option_a_image; delete q.option_b_image; delete q.option_c_image; delete q.option_d_image;

        res.json({
            stage: currentStage,
            question_number: answeredCount + 1,
            current_difficulty: targetLevel,
            question: q
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดใน API ดึงข้อสอบ:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

// 3. API โหมดฝึกทำ: ตรวจคำตอบ (รับเป็น part_id แทน)
router.post('/submit', async (req, res) => {
    try {
        const { user_id, session_id, question_id, part_id, user_answer } = req.body;

        if (!user_id || !session_id || !question_id || !part_id || !user_answer) {
            return res.status(400).json({ error: "ส่งข้อมูลมาไม่ครบครับ" });
        }

        const partIdNum = parseInt(part_id);

        const [questions] = await db.query(`SELECT correct_answer, explanation, difficulty_level FROM questions WHERE id = ?`, [question_id]);
        
        const correctAnswer = questions[0].correct_answer.trim();
        const explanation = questions[0].explanation;
        const difficulty = questions[0].difficulty_level;
        const cleanUserAnswer = user_answer.trim();

        const isCorrect = cleanUserAnswer.startsWith(correctAnswer) || cleanUserAnswer === correctAnswer;

        await db.query(
            `INSERT INTO user_answers (session_id, question_id, user_answer) VALUES (?, ?, ?)`,
            [session_id, question_id, user_answer]
        );

        let earnedScore = 0;
        if (isCorrect) {
            earnedScore = difficulty; 
            await db.query(`UPDATE exam_sessions SET total_score = total_score + ? WHERE id = ?`, [earnedScore, session_id]);
        }

        const [answerCount] = await db.query(`SELECT COUNT(*) as total FROM user_answers WHERE session_id = ?`, [session_id]);
        const totalAnswered = answerCount[0].total;
        const isFinished = totalAnswered >= 20;

        // ถ้าทำครบ 20 ข้อ ให้คำนวณและบันทึกคะแนน
        if (isFinished) {
            await db.query(`UPDATE exam_sessions SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [session_id]);
            
            const [[sessionData]] = await db.query(`SELECT total_score FROM exam_sessions WHERE id = ?`, [session_id]);
            const userScore = sessionData.total_score || 0;

            await db.query(`
                INSERT INTO user_skills (user_id, part_id, proficiency_level, accumulated_score) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    proficiency_level = ?, 
                    accumulated_score = ?`,
                [user_id, partIdNum, difficulty, userScore, difficulty, userScore] 
            );

            const maxPossibleScore = 100;
            const finalPercentage = userScore; 

            // คืนค่ากลับไปพร้อมก้อน summary สรุปผล
            return res.json({
                is_correct: isCorrect,
                earned_score: earnedScore,
                correct_answer: correctAnswer,
                explanation: explanation,
                current_level: difficulty,
                total_answered: totalAnswered,
                is_finished: true,
                summary: {
                    user_score: userScore,
                    max_score: maxPossibleScore,
                    percentage: finalPercentage,
                    status: 'FINISHED'
                }
            });
        }

        // กรณีที่ยังไม่ครบ 20 ข้อ (ส่งข้อมูลปกติ)
        res.json({
            is_correct: isCorrect,
            earned_score: earnedScore,
            correct_answer: correctAnswer,
            explanation: explanation,
            current_level: difficulty,
            total_answered: totalAnswered,
            is_finished: false
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการตรวจคำตอบ:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

// API ดึงข้อมูลสำหรับทำกราฟใยแมงมุม (Spider Chart)
router.get('/radar-chart', async (req, res) => {
    try {
        const { user_id, category } = req.query;

        if (!user_id || !category) {
            return res.status(400).json({ error: "กรุณาส่ง user_id และ category" });
        }

        // ดึงชื่อพาร์ททั้งหมดในหมวดนั้น และ Level ของผู้ใช้ (ถ้ายังไม่เคยสอบ ให้ค่าเป็น 0)
        const [radarData] = await db.query(`
            SELECT 
                p.part_name as subject, 
                IFNULL(us.proficiency_level, 0) as level
            FROM parts p
            LEFT JOIN user_skills us ON p.id = us.part_id AND us.user_id = ?
            WHERE p.category = ?
        `, [user_id, category]);

        res.json(radarData);

    } catch (error) {
        console.error("Error fetching radar data:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลกราฟ" });
    }
});

// API สำหรับดึงข้อมูล Part เดียว (ใช้ตอนโดดข้ามมาจากตาราง Planner)
router.get('/part-info', async (req, res) => {
    try {
        const { part_id } = req.query;
        if (!part_id) return res.status(400).json({ error: "Missing part_id" });

        const [parts] = await db.query(`
            SELECT id, category, part_name 
            FROM parts 
            WHERE id = ?
        `, [part_id]);

        if (parts.length === 0) {
            return res.status(404).json({ error: "ไม่พบรายวิชานี้" });
        }

        res.json(parts[0]);
    } catch (error) {
        console.error("Error fetching part info:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;