const express = require('express');
const router = express.Router();
const db = require('../db');

// API สร้างชุดข้อสอบ 100 ข้อตามเลเวลผู้ใช้ (อัปเกรดลอจิกตัวตายตัวแทน)
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

       // ฟังก์ชันตัวช่วย: ดึงข้อสอบตามหมวดหมู่หลัก (ใช้ LIKE ป้องกันการสะกดไม่ตรงเป๊ะ)
        const fetchQuestions = async (mainCategoryKeyword, quotaLimit) => {
            const [parts] = await db.query(
                `SELECT id, part_name FROM parts WHERE category LIKE ?`,
                [`%${mainCategoryKeyword}%`]
            );

            if (parts.length === 0) return [];

            let easyPool = [];     
            let currentPool = [];  
            let hardPool = [];     

            for (let row of parts) {
                const partId = row.id;
                const partName = row.part_name;
                
                // ถ้าไม่มีข้อมูลถือว่าเป็น Level 1
                const diffLevel = userSkillMap[partName] || 1; 
                const easyLevel = Math.max(diffLevel - 1, 1);
                const challengeLevel = Math.min(diffLevel + 1, 5); 

                // ดึงข้อสอบมาตุนไว้เยอะๆ ก่อน (เพิ่ม LIMIT เป็น 200 เผื่อข้อสอบขาด)
                const [qList] = await db.query(`
                    SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, exam_year, explanation, correct_answer
                    FROM questions
                    WHERE part_id = ? AND difficulty_level IN (?, ?, ?)
                    ORDER BY RAND() LIMIT 200
                `, [partId, easyLevel, diffLevel, challengeLevel]);

                qList.forEach(q => {
                    const optionsArray = [q.option_a, q.option_b, q.option_c, q.option_d];
                    delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
                    const formattedQ = { ...q, options: optionsArray };

                    // แยกข้อสอบลงตะกร้า
                    if (q.difficulty_level === diffLevel) {
                        currentPool.push(formattedQ);
                    } else if (q.difficulty_level < diffLevel) {
                        easyPool.push(formattedQ);
                    } else if (q.difficulty_level > diffLevel) {
                        hardPool.push(formattedQ);
                    }
                });
            }

            // เขย่าตะกร้าแต่ละใบให้มั่ว
            easyPool.sort(() => Math.random() - 0.5);
            currentPool.sort(() => Math.random() - 0.5);
            hardPool.sort(() => Math.random() - 0.5);

            // โควตา 10 - 80 - 10
            const easyQuota = Math.floor(quotaLimit * 0.1); 
            const hardQuota = Math.floor(quotaLimit * 0.1); 

            let finalQuestions = [];

            // หยิบข้อง่าย และข้อยาก
            finalQuestions.push(...easyPool.splice(0, easyQuota));
            finalQuestions.push(...hardPool.splice(0, hardQuota));

            // โควตาที่เหลือ โกยจาก currentPool
            const remainingQuota = quotaLimit - finalQuestions.length;
            finalQuestions.push(...currentPool.splice(0, remainingQuota));

            // LIFESAVER 1: ถ้าดึง currentPool แล้วยังไม่พอ ให้เอาของที่เหลือในตะกร้าอื่นมาโปะ
            if (finalQuestions.length < quotaLimit) {
                let leftoverPool = [...easyPool, ...currentPool, ...hardPool];
                leftoverPool.sort(() => Math.random() - 0.5);
                
                const fillAmount = quotaLimit - finalQuestions.length;
                finalQuestions.push(...leftoverPool.splice(0, fillAmount));
            }

            //  ULTIMATE LIFESAVER 2: ถ้าตะกร้าบนว่างเปล่าจริงๆ กวาดข้อสอบที่เหลือทั้งหมดใน DB มาโปะ!
            if (finalQuestions.length < quotaLimit) {
                const ultimateFillAmount = quotaLimit - finalQuestions.length;
                const partIds = parts.map(p => p.id);
                
                if (partIds.length > 0) {
                    const existingIds = finalQuestions.map(q => q.id);
                    const excludeIds = existingIds.length > 0 ? existingIds.join(',') : '0'; 
                    
                    const [emergencyQuestions] = await db.query(`
                        SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, exam_year, explanation, correct_answer
                        FROM questions
                        WHERE part_id IN (?) AND id NOT IN (${excludeIds})
                        ORDER BY RAND() LIMIT ?
                    `, [partIds, ultimateFillAmount]);

                    emergencyQuestions.forEach(q => {
                        const optionsArray = [q.option_a, q.option_b, q.option_c, q.option_d];
                        delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
                        finalQuestions.push({ ...q, options: optionsArray });
                    });
                }
            }

            // เขย่ารวมครั้งสุดท้าย ตัดให้พอดีเป๊ะ
            finalQuestions.sort(() => Math.random() - 0.5);
            return finalQuestions.slice(0, quotaLimit);
        };

        // 2. สั่งดึงข้อสอบ (ใช้ Keyword สั้นๆ เพื่อให้ LIKE ทำงานได้ครอบคลุม)
        const part1 = await fetchQuestions('คิดวิเคราะห์', 50);
        const part2 = await fetchQuestions('อังกฤษ', 25);
        const part3 = await fetchQuestions('ข้าราชการที่ดี', 25);

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

// API บันทึกคะแนนสอบ Mock Exam (คงเดิม)
router.post('/submit', async (req, res) => {
    try {
        const { session_id, total_score } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: "ไม่พบข้อมูลรอบการสอบ (session_id)" });
        }

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