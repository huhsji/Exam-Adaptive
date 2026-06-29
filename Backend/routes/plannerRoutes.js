const express = require('express');
const router = express.Router();
const db  = require('../db');

router.get('/' , async (req , res) =>{
    try {
        const { user_id } = req.query;
        if(!user_id) return res.status(400).json({error: "กรุณาส่ง user_id "});

        const [[user]] = await db.query(`SELECT target_exam_date FROM users WHERE id = ?`, [user_id]);

        const [planners] = await db.query(`
            SELECT 
                sp.part_id, 
                p.category, 
                p.part_name, 
                DATE_FORMAT(sp.scheduled_date, '%Y-%m-%d') as scheduled_date,
                sp.is_completed
            FROM study_planners sp
            JOIN parts p ON sp.part_id = p.id
            WHERE sp.user_id = ?
            ORDER BY sp.scheduled_date ASC
        `, [user_id]);

        const [progressRaw] = await db.query(`
            SELECT 
                p.category,
                COUNT(p.id) as total_parts,
                SUM(CASE WHEN us.proficiency_level >= 3 THEN 1 ELSE 0 END) as passed_parts
            FROM parts p
            LEFT JOIN user_skills us ON p.id = us.part_id AND us.user_id = ?
            GROUP BY p.category
        `, [user_id]);

        // แปลงเป็น %
        const progress = progressRaw.map(row => ({
            category: row.category,
            percentage: row.total_parts > 0 ? Math.round((row.passed_parts / row.total_parts) * 100) : 0,
            total: row.total_parts,
            passed: row.passed_parts || 0
        }));

        res.json({
            target_exam_date: user ? user.target_exam_date : null,
            planners: planners
        });

    }catch (error) {
        console.error("Error fetching planner:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูล Planner" });
    }
});

router.post('/toggle-plan' , async (req , res) => {
    try {
        const {user_id, part_id, scheduled_date, is_completed } = req.body;
        if (!user_id || !part_id || !scheduled_date) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
        
        await db.query(`
            UPDATE study_planners 
            SET is_completed = ? 
            WHERE user_id = ? AND part_id = ? AND scheduled_date = ?
        `, [is_completed, user_id, part_id, scheduled_date]);

        res.json({ message: "อัปเดตสถานะการอ่านสำเร็จ" });

    }catch (error) {
        console.error("Error toggling plan:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหา" });
    }
});

router.post('/generate' , async (req , res) => {
    try{
        const { user_id, target_date } = req.body;

        if (!user_id || !target_date) {
            return res.status(400).json({ error: "กรุณาส่ง user_id และ target_date มาให้ครบถ้วนครับ" });
        }
        // อัปเดตวันสอบเป้าหมายลงตาราง users
        await db.query(`UPDATE users SET target_exam_date = ? WHERE id = ?`, [target_date, user_id]);

        // เคลียร์แผนเดิมในอนาคตที่ยังทำไม่เสร็จ 
        await db.query(`
            DELETE FROM study_planners 
            WHERE user_id = ? AND scheduled_date >= CURDATE() AND is_completed = 0
        `, [user_id]);

        const today = new Date();
        const examDate = new Date(target_date);

        let availableDates = [];
        let loopDate = new Date(today);
        loopDate.setDate(loopDate.getDate() + 1);

        while (loopDate < examDate ) {
            availableDates.push(loopDate.toISOString().split('T')[0]);
            loopDate.setDate(loopDate.getDate() + 1);
        }

        if (availableDates.length === 0) {
            return res.status(400).json({ error: "ระยะเวลาสั้นเกินไป ไม่สามารถจัดตารางได้ครับ" });
        }

        // ล็อก 3 วันสุดท้ายไว้สำหรับทำ Mock Exam
        let mockExamDates = [];
        if (availableDates.length > 3) {
            mockExamDates = availableDates.splice(-3);
        }

        // ดึงรายชื่อพาร์ทวิชาทั้งหมด เรียงลำดับตาม "จุดอ่อน" (Level น้อยสุดขึ้นก่อน)
        const [weaknesses] = await db.query(`
            SELECT 
                p.id as part_id,
                IFNULL(us.proficiency_level, 0) as level
            FROM parts p
            LEFT JOIN user_skills us ON p.id = us.part_id AND us.user_id = ?
            ORDER BY level ASC, p.category, p.id
        `, [user_id]);
        
        if (weaknesses.length === 0) {
            return res.status(400).json({ error: "ไม่พบข้อมูลรายวิชาในระบบ" });
        }

        // ลูปแจกจ่ายวิชาลงในแต่ละวัน
        let partIndex = 0;
        let dayCounter = 1;

        for (const dateStr of availableDates) {
            // เว้นวันพักผ่อน ทุกๆ 7 วัน
            if (dayCounter % 7 === 0) {
                dayCounter++;
                continue; 
            }

            const currentPart = weaknesses[partIndex % weaknesses.length];
            
            await db.query(`
                INSERT INTO study_planners (user_id, part_id, scheduled_date, is_completed)
                VALUES (?, ?, ?, 0)
                ON DUPLICATE KEY UPDATE part_id = VALUES(part_id)
            `, [user_id, currentPart.part_id, dateStr]);

            partIndex++;
            dayCounter++;
        }

 res.json({ 
            message: "ระบบอัจฉริยะจัดตารางติวเข้มให้คุณเรียบร้อยแล้ว!",
            days_planned: availableDates.length,
            mock_days_reserved: mockExamDates.length
        });

    } catch (error) {
        console.error("Error generating smart plan:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการคำนวณและสร้างแผนการเรียน" });
    }
});

module.exports = router;