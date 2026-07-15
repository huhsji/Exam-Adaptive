const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        const { user_id } = req.query;
        if(!user_id) return res.status(400).json({error: "กรุณาส่ง user_id "});

        const [[user]] = await db.query(`SELECT target_exam_date FROM users WHERE id = ?`, [user_id]);

        //  JOIN user_skills เพื่อเอา proficiency_level ส่งไปให้หน้าบ้านตัดสินใจเปลี่ยนสีการ์ด
        const [planners] = await db.query(`
            SELECT 
                sp.part_id, 
                p.category, 
                p.part_name, 
                DATE_FORMAT(sp.scheduled_date, '%Y-%m-%d') as scheduled_date, 
                sp.is_completed,
                IFNULL(us.proficiency_level, 0) as current_level
            FROM study_planners sp
            JOIN parts p ON sp.part_id = p.id
            LEFT JOIN user_skills us ON p.id = us.part_id AND us.user_id = sp.user_id
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

        const progress = progressRaw.map(row => ({
            category: row.category,
            percentage: row.total_parts > 0 ? Math.round((row.passed_parts / row.total_parts) * 100) : 0,
            total: row.total_parts,
            passed: row.passed_parts || 0
        }));

        res.json({
            target_exam_date: user ? user.target_exam_date : null,
            planners: planners,
            progress: progress
        });

    }catch (error) {
        console.error("Error fetching planner:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูล Planner" });
    }
});

router.post('/toggle-plan', async (req, res) => {
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

router.post('/generate', async (req, res) => {
    try {
        const { user_id, target_date } = req.body;
        if (!user_id || !target_date) return res.status(400).json({ error: "กรุณาส่ง user_id และ target_date มาให้ครบถ้วน" });
        
        await db.query(`UPDATE users SET target_exam_date = ? WHERE id = ?`, [target_date, user_id]);

        //  กฎทับตาราง "วันนี้": เช็กว่าวันนี้มียูสเซอร์ทำไปหรือยัง
        const [todayDone] = await db.query(`
            SELECT COUNT(*) as cnt FROM study_planners 
            WHERE user_id = ? AND scheduled_date = CURDATE() AND is_completed = 1
        `, [user_id]);

        const hasDoneToday = todayDone[0].cnt > 0;
        

        // โละตารางอนาคตทิ้ง (ถ้าวันนี้ทำแล้ว จะไม่ลบของวันนี้ทิ้ง)
       await db.query(`
            DELETE FROM study_planners 
            WHERE user_id = ? AND is_completed = 0
        `, [user_id]);

        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(target_date);
        examDate.setHours(0,0,0,0);

        let availableDates = [];
        let loopDate = new Date(today);
        if (hasDoneToday) loopDate.setDate(loopDate.getDate() + 1); // ขยับไปเริ่มพรุ่งนี้ถ้าวันนี้ทำเสร็จแล้ว

        
        while (loopDate <= examDate) {
            const yyyy = loopDate.getFullYear();
            const mm = String(loopDate.getMonth() + 1).padStart(2, '0');
            const dd = String(loopDate.getDate()).padStart(2, '0');
            const localDateStr = `${yyyy}-${mm}-${dd}`;
            
            availableDates.push(localDateStr);
            loopDate.setDate(loopDate.getDate() + 1);
        }

        if (availableDates.length === 0) {
            return res.status(400).json({ error: "ระยะเวลาสั้นเกินไป ไม่สามารถจัดตารางได้ครับ" });
        }

        let mockExamDates = [];
        let studyDates = [];

        if (availableDates.length > 3) {
            mockExamDates = availableDates.slice(-3);
            studyDates = availableDates.slice(0, -3);
        } else if (availableDates.length === 3) {
            mockExamDates = availableDates.slice(-1);
            studyDates = availableDates.slice(0, -1);
        } else {
            studyDates = availableDates;
        }

        const activeStudyDates = studyDates.filter((_, idx) => (idx + 1) % 7 !== 0);

        const [allParts] = await db.query(`
            SELECT 
                p.id as part_id, 
                IFNULL(us.proficiency_level, 0) as level
            FROM parts p
            LEFT JOIN user_skills us ON p.id = us.part_id AND us.user_id = ?
            WHERE p.category != 'Mock Exam'
            ORDER BY level ASC, p.category, p.id
        `, [user_id]);

        if (allParts.length === 0) return res.status(400).json({ error: "ไม่พบข้อมูลรายวิชา" });

        let targetParts = allParts.filter(p => p.level < 3);
        if (targetParts.length === 0) {
            targetParts = [...allParts]; 
        }

        if (activeStudyDates.length > 0) {
            const quotaPerDay = Math.ceil(targetParts.length / activeStudyDates.length) || 1;
            let partIndex = 0;
            
            for (const dateStr of activeStudyDates) {
                for (let q = 0; q < quotaPerDay; q++) {
                    const currentPart = targetParts[partIndex % targetParts.length]; // Modulo วนลูปกลับมาเริ่มวิชาแรกใหม่
                    
                    await db.query(`
                        INSERT INTO study_planners (user_id, part_id, scheduled_date, is_completed)
                        VALUES (?, ?, ?, 0)
                        ON DUPLICATE KEY UPDATE scheduled_date = VALUES(scheduled_date)
                    `, [user_id, currentPart.part_id, dateStr]);

                    partIndex++;
                }
            }
        }

        let [[mockPart]] = await db.query(`SELECT id FROM parts WHERE category = 'Mock Exam' LIMIT 1`);
        if (!mockPart) {
            const [insertMock] = await db.query(`INSERT INTO parts (category, part_name) VALUES ('Mock Exam', 'จำลองสอบจริง (100 ข้อ จับเวลา 3 ชม.)')`);
            mockPart = { id: insertMock.insertId };
        }

        for (const dateStr of mockExamDates) {
            await db.query(`
                INSERT INTO study_planners (user_id, part_id, scheduled_date, is_completed)
                VALUES (?, ?, ?, 0)
                ON DUPLICATE KEY UPDATE part_id = VALUES(part_id)
            `, [user_id, mockPart.id, dateStr]);
        }

        res.json({
            message: "ระบบอัจฉริยะจัดตารางติวเข้มให้คุณเรียบร้อยแล้ว!",
            days_planned: activeStudyDates.length,
            mock_days_reserved: mockExamDates.length
        });

    } catch (error) {
        console.error("Error generating smart plan:", error);
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการคำนวณและสร้างแผนการเรียน" });
    }
});

module.exports = router;