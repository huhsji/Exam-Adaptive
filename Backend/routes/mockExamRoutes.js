const express = require('express');
const router = express.Router();
const db = require('../db');

// สร้างชุดข้อสอบ 100 ข้อตามเลเวลผู้ใช้ 
router.post('/generate', async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "กรุณาส่ง user_id มาด้วยครับ" });
        }

        // กวาดข้อมูลเลเวลสกิล "ทุกวิชา" ของ User คนนี้มาเตรียมไว้
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

       // ฟังก์ชันตัวช่วย ดึงข้อสอบตามหมวดหมู่หลัก 
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
                
                const diffLevel = userSkillMap[partName] || 1; 
                const easyLevel = Math.max(diffLevel - 1, 1);
                const challengeLevel = Math.min(diffLevel + 1, 5); 

                const [qList] = await db.query(`
                    SELECT id, part_id, difficulty_level, question_text, question_image, 
                           option_a, option_b, option_c, option_d,
                           option_a_image, option_b_image, option_c_image, option_d_image,
                           exam_year, explanation, correct_answer
                    FROM questions
                    WHERE part_id = ? AND difficulty_level IN (?, ?, ?)
                    ORDER BY RAND() LIMIT 200
                `, [partId, easyLevel, diffLevel, challengeLevel]);

                qList.forEach(q => {
                    //   ปรับโครงสร้าง options ให้เก็บค่าเป็น Object { text, image }
                    const optionsArray = [
                        { text: q.option_a, image: q.option_a_image },
                        { text: q.option_b, image: q.option_b_image },
                        { text: q.option_c, image: q.option_c_image },
                        { text: q.option_d, image: q.option_d_image }
                    ];
                    delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
                    //  ลบฟิลด์รูปช้อยส์ออกเพื่อไม่ให้รก object หลัก
                    delete q.option_a_image; delete q.option_b_image; delete q.option_c_image; delete q.option_d_image;
                    
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

            const easyQuota = Math.floor(quotaLimit * 0.1); 
            const hardQuota = Math.floor(quotaLimit * 0.1); 

            let finalQuestions = [];

            // หยิบข้อง่าย และข้อยาก
            finalQuestions.push(...easyPool.splice(0, easyQuota));
            finalQuestions.push(...hardPool.splice(0, hardQuota));

            // โควตาที่เหลือ โกยจาก currentPool
            const remainingQuota = quotaLimit - finalQuestions.length;
            finalQuestions.push(...currentPool.splice(0, remainingQuota));

            if (finalQuestions.length < quotaLimit) {
                let leftoverPool = [...easyPool, ...currentPool, ...hardPool];
                leftoverPool.sort(() => Math.random() - 0.5);
                
                const fillAmount = quotaLimit - finalQuestions.length;
                finalQuestions.push(...leftoverPool.splice(0, fillAmount));
            }

            // ถ้าตะกร้าบนว่าง กวาดข้อสอบที่เหลือทั้งหมดใน DB มา
            if (finalQuestions.length < quotaLimit) {
                const ultimateFillAmount = quotaLimit - finalQuestions.length;
                const partIds = parts.map(p => p.id);
                
                if (partIds.length > 0) {
                    const existingIds = finalQuestions.map(q => q.id);
                    const excludeIds = existingIds.length > 0 ? existingIds.join(',') : '0'; 
                    
                    // ดึงฟิลด์รูปภาพมาให้ครบ
                    const [emergencyQuestions] = await db.query(`
                        SELECT id, part_id, difficulty_level, question_text, question_image,
                               option_a, option_b, option_c, option_d,
                               option_a_image, option_b_image, option_c_image, option_d_image,
                               exam_year, explanation, correct_answer
                        FROM questions
                        WHERE part_id IN (?) AND id NOT IN (${excludeIds})
                        ORDER BY RAND() LIMIT ?
                    `, [partIds, ultimateFillAmount]);

                    emergencyQuestions.forEach(q => {
                        // จัดรูป options เป็น Object 
                        const optionsArray = [
                            { text: q.option_a, image: q.option_a_image },
                            { text: q.option_b, image: q.option_b_image },
                            { text: q.option_c, image: q.option_c_image },
                            { text: q.option_d, image: q.option_d_image }
                        ];
                        delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
                        delete q.option_a_image; delete q.option_b_image; delete q.option_c_image; delete q.option_d_image;
                        
                        finalQuestions.push({ ...q, options: optionsArray });
                    });
                }
            }
            
            finalQuestions.sort(() => Math.random() - 0.5);
            return finalQuestions.slice(0, quotaLimit);
        };

        // ดึงข้อสอบ
        const part1 = await fetchQuestions('คิดวิเคราะห์', 50);
        const part2 = await fetchQuestions('อังกฤษ', 25);
        const part3 = await fetchQuestions('ข้าราชการที่ดี', 25);

        let allQuestions = [...part1, ...part2, ...part3];

        allQuestions.sort(() => Math.random() - 0.5);

        const [sessionResult] = await db.query(
            `INSERT INTO exam_sessions (user_id, session_type) VALUES (?, ?)`,
            [user_id, 'mock_exam_100']
        );
        
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


router.post('/submit', async (req, res) => {
    try {
        const { session_id, user_answers } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: "ไม่พบข้อมูลรอบการสอบ (session_id)" });
        }

        let final_score = 0;
        const answeredQuestionIds = user_answers ? Object.keys(user_answers) : [];

        if (answeredQuestionIds.length > 0) {
            const [correctAnswers] = await db.query(`
                SELECT id, correct_answer 
                FROM questions 
                WHERE id IN (?)
            `, [answeredQuestionIds]);

            correctAnswers.forEach(q => {
                const userAnswer = user_answers[q.id];
                if (userAnswer) {
                    const cleanUserAnswer = userAnswer.trim();
                    const correctAnswer = q.correct_answer ? q.correct_answer.trim() : '';
                    
                    if (cleanUserAnswer.startsWith(correctAnswer) || cleanUserAnswer === correctAnswer) {
                        final_score += 1;
                    }
                }
            });
        }

        await db.query(`
            UPDATE exam_sessions 
            SET total_score = ?, 
                is_completed = TRUE, 
                completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [final_score, session_id]);

        res.json({ message: "บันทึกคะแนนสอบสำเร็จ", final_score: final_score });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการบันทึกคะแนน mock exam:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการตรวจและบันทึกคะแนน" });
    }
});

module.exports = router;