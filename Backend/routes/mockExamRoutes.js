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

            // สร้างตะกร้า 3 ใบเพื่อแยกข้อสอบตามระดับความยาก
            let easyPool = [];     // ตะกร้าข้อง่าย (Level ต่ำกว่าปัจจุบัน)
            let currentPool = [];  // ตะกร้าข้อพอดีเลเวล (Level ปัจจุบัน)
            let hardPool = [];     // ตะกร้าข้อยากท้าทาย (Level สูงกว่าปัจจุบัน)

            for (let row of parts) {
                const partId = row.id;
                const partName = row.part_name;
                
                //ดึงสกิลของพาร์ทนี้ ถ้าไม่มีให้เริ่มที่เลเวล 3
                const diffLevel = userSkillMap[partName] || 3; 
                const easyLevel = Math.max(diffLevel - 1, 1);
                const challengeLevel = Math.min(diffLevel + 1, 5); 

                // ดึงข้อสอบแบบสุ่มของพาร์ทนี้ขึ้นมาเผื่อไว้ (LIMIT 40 เพื่อดึงมาตุนไว้ในโกดัง)
                const [qList] = await db.query(`
                    SELECT id, part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, exam_year, explanation, correct_answer
                    FROM questions
                    WHERE part_id = ? AND difficulty_level IN (?, ?, ?)
                    ORDER BY RAND() LIMIT 40
                `, [partId, easyLevel, diffLevel, challengeLevel]);

                // แยกข้อสอบโยนลงตะกร้าแต่ละใบ
                qList.forEach(q => {
                    // แปลงช้อยส์จับมัดรวมเป็น Array
                    const optionsArray = [q.option_a, q.option_b, q.option_c, q.option_d];
                    delete q.option_a; delete q.option_b; delete q.option_c; delete q.option_d;
                    const formattedQ = { ...q, options: optionsArray };

                    // เช็กว่าข้อนี้ควรอยู่ตะกร้าไหน (อิงตามเลเวลของพาร์ทนี้)
                    if (q.difficulty_level === diffLevel) {
                        currentPool.push(formattedQ);
                    } else if (q.difficulty_level < diffLevel) {
                        easyPool.push(formattedQ);
                    } else if (q.difficulty_level > diffLevel) {
                        hardPool.push(formattedQ);
                    }
                });
            }

            // เขย่าตะกร้าแต่ละใบให้มั่ว (ข้อสอบจากทุกพาร์ทจะผสมกัน)
            easyPool.sort(() => Math.random() - 0.5);
            currentPool.sort(() => Math.random() - 0.5);
            hardPool.sort(() => Math.random() - 0.5);

            // คำนวณโควตาว่าจะหยิบจากตะกร้าไหนกี่ข้อ (สัดส่วน 10 - 80 - 10)
            const easyQuota = Math.floor(quotaLimit * 0.1); 
            const hardQuota = Math.floor(quotaLimit * 0.1); 

            let finalQuestions = [];

            // หยิบข้อง่าย และข้อยาก ใส่ชุดข้อสอบจริงก่อน
            finalQuestions.push(...easyPool.slice(0, easyQuota));
            finalQuestions.push(...hardPool.slice(0, hardQuota));

            // โควตาที่เหลือทั้งหมด (80% หรือส่วนที่ยังขาด) ให้ไปโกยมาจากตะกร้าเลเวลหลัก
            const remainingQuota = quotaLimit - finalQuestions.length;
            finalQuestions.push(...currentPool.slice(0, remainingQuota));

            // เขย่ารวมครั้งสุดท้าย เพื่อไม่ให้ข้อง่ายไปกองอยู่ข้อแรกๆ
            finalQuestions.sort(() => Math.random() - 0.5);

            return finalQuestions;
        };

        // [ส่วนที่พี่ฮัชเผลอลบทิ้งไป] 
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