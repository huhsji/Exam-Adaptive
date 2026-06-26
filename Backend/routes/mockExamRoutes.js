const express = require('express');
const router = express.Router();
const db = require('../db');

//  API สร้างชุดข้อสอบ 100 ข้อตามเลเวลผู้ใช้
router.post('/generate', async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "กรุณาส่ง user_id มาด้วยครับ" });
        }

        // 1. กวาดข้อมูลเลเวลสกิล "ทุกวิชา" ของ User คนนี้มาเตรียมไว้
        const [skills] = await db.query(`
            SELECT p.part_name, us.proficiency_level 
            FROM user_skills us
            JOIN parts p ON us.part_id = p.id
            WHERE us.user_id = ?
        `, [user_id]);
        
        const userSkillMap = {};
        skills.forEach(skill => {
            userSkillMap[skill.part_name] = skill.proficiency_level;
        });

       //  ฟังก์ชันตัวช่วย: ดึงข้อสอบตามหมวดหมู่หลัก (Main Category)
        const fetchQuestions = async (mainCategoryName, quotaLimit) => {
            const [parts] = await db.query(
                `SELECT id, part_name FROM parts WHERE category = ?`,
                [mainCategoryName]
            );

            if (parts.length === 0) return [];

            let questionsPool = []; // สร้างตะกร้าใหญ่เพื่อเก็บข้อสอบรวม

            for (let row of parts) {
                const partId = row.id;
                const partName = row.part_name;
                
                // ถ้ามีสกิลให้ใช้เลเวลนั้น ถ้าไม่มี (เด็กใหม่) ให้เริ่มที่เลเวล 3
                const diffLevel = userSkillMap[partName] || 3; 

                //  แก้ไข: ให้ดึงเผื่อมาเลย (ดึงมาให้เยอะที่สุดเท่าที่จะเป็นไปได้ในพาร์ทนี้)
                const [qList] = await db.query(`
                    SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, exam_year, explanation, correct_answer
                    FROM questions
                    WHERE part_id = ? AND difficulty_level = ?
                    ORDER BY RAND() LIMIT ?
                `, [partId, diffLevel, quotaLimit]); // เปลี่ยนจาก limitPerSub เป็น quotaLimit

                // แปลงช้อยส์จับมัดรวมเป็น Array
                const formattedQuestions = qList.map(q => {
                    const optionsArray = [q.option_a, q.option_b, q.option_c, q.option_d];
                    delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
                    return { ...q, options: optionsArray };
                });

                questionsPool.push(...formattedQuestions); // โยนใส่ตะกร้าใหญ่
            }

            //  สลับข้อสอบในตะกร้าหมวดนี้ให้คละๆ กัน (Shuffle) ไม่ให้กระจุกอยู่พาร์ทเดียว
            questionsPool.sort(() => Math.random() - 0.5);

            //  ตัดแบ่งเอาไปใช้แค่เท่ากับจำนวนโควตาเป๊ะๆ (เช่น ขอ 50 ก็ตัดไป 50)
            return questionsPool.slice(0, quotaLimit);
        };

        // 2. สั่งดึงข้อสอบตามโควตา 50 - 25 - 25
        const part1 = await fetchQuestions('วิชาความรู้ความสามารถในการคิดวิเคราะห์', 50);
        const part2 = await fetchQuestions('วิชาภาษาอังกฤษ', 25);
        const part3 = await fetchQuestions('วิชาความรู้และลักษณะการเป็นข้าราชการที่ดี', 25);

        // 3. เอาข้อสอบทั้ง 3 ก้อนมารวมร่างกัน
        let allQuestions = [...part1, ...part2, ...part3];

        // 4. สลับข้อสอบให้มั่ว (Shuffle) เหมือนข้อสอบจริง
        allQuestions.sort(() => Math.random() - 0.5);

        // 5. สร้างประวัติในตาราง exam_sessions เพื่อออก session_id
        const [sessionResult] = await db.query(
            `INSERT INTO exam_sessions (user_id, session_type) VALUES (?, ?)`,
            [user_id, 'mock_exam_100']
        );

        // 6. ส่งชุดข้อสอบกลับไปให้หน้าบ้าน
        res.json({
            message: "สร้างชุดข้อสอบ Mock Exam สำเร็จ",
            session_id: sessionResult.insertId,
            total_questions_found: allQuestions.length,
            questions: allQuestions
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อสอบ mock exam:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

//  API บันทึกคะแนนสอบ Mock Exam
router.post('/submit', async (req, res) => {
    try {
        const { session_id, total_score } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: "ไม่พบข้อมูลรอบการสอบ (session_id)" });
        }

        // อัปเดตคะแนนลงในตาราง exam_sessions และปิดสถานะการสอบ
        await db.query(`
            UPDATE exam_sessions 
            SET total_score = ?, 
                is_completed = TRUE, 
                completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [total_score, session_id]);

        res.json({ message: "บันทึกคะแนนสอบสำเร็จ", final_score: total_score });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการบันทึกคะแนน mock exam:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการบันทึกคะแนน" });
    }
});

module.exports = router;