const db = require('./db');

async function initializeDatabase() {
    try {
        console.log("⏳ กำลังเตรียมล้างตารางและสร้างฐานข้อมูลใหม่ตาม DBML...");

        // ⚠️ ลบฐานข้อมูลเดิมทิ้งเพื่อเคลียร์โครงสร้างเก่าให้เป็น 0
        await db.query(`DROP DATABASE IF EXISTS adaptive_exam_db`);
        
        // สร้างและเลือกฐานข้อมูลใหม่
        await db.query(`CREATE DATABASE adaptive_exam_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.query(`USE adaptive_exam_db`);

        // ==========================================
        // 🗂️ 1. กลุ่มตารางหลักของระบบ (Parent Tables)
        // ==========================================

        // 1. ตาราง users
        const createUsers = `
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                target_exam_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // 2. ตาราง parts
        const createParts = `
            CREATE TABLE parts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                part_name VARCHAR(255) NOT NULL UNIQUE,
                category VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // ==========================================
        // 🏃‍♂️ 2. กลุ่มระบบการสอบ (Examination)
        // ==========================================

        // 3. ตาราง questions
        const createQuestions = `
            CREATE TABLE questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                part_id INT NOT NULL,
                difficulty_level TINYINT NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NULL,
                option_b TEXT NULL,
                option_c TEXT NULL,
                option_d TEXT NULL,
                correct_answer VARCHAR(255) NOT NULL,
                exam_year VARCHAR(10) NULL,
                explanation TEXT NULL,
                FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // 4. ตาราง exam_sessions
        const createExamSessions = `
            CREATE TABLE exam_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                session_type VARCHAR(255) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                total_score INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // 5. ตาราง user_answers
        const createUserAnswers = `
            CREATE TABLE user_answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                question_id INT NOT NULL,
                user_answer VARCHAR(255) NOT NULL,
                answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // ==========================================
        // 🎯 3. ระบบความเก่งและแผนปฏิทิน (Adaptive & Planner)
        // ==========================================

        // 6. ตาราง user_skills
        const createUserSkills = `
            CREATE TABLE user_skills (
                user_id INT NOT NULL,
                part_id INT NOT NULL,
                proficiency_score TINYINT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'failed',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, part_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // 7. ตาราง study_planners
        const createStudyPlanners = `
            CREATE TABLE study_planners (
                user_id INT NOT NULL,
                part_id INT NOT NULL,
                scheduled_date DATE NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, part_id, scheduled_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        // --- รันคำสั่ง SQL สร้างทีละตารางให้ถูกต้องตามลำดับ (เพื่อไม่ให้ติด Error FK) ---
        await db.query(createUsers);
        console.log("✅ 1/7 สร้างตาราง users");

        await db.query(createParts);
        console.log("✅ 2/7 สร้างตาราง parts");

        await db.query(createQuestions);
        console.log("✅ 3/7 สร้างตาราง questions");

        await db.query(createExamSessions);
        console.log("✅ 4/7 สร้างตาราง exam_sessions");

        await db.query(createUserAnswers);
        console.log("✅ 5/7 สร้างตาราง user_answers");

        await db.query(createUserSkills);
        console.log("✅ 6/7 สร้างตาราง user_skills");

        await db.query(createStudyPlanners);
        console.log("✅ 7/7 สร้างตาราง study_planners");

        console.log("🎉 ล้างและสร้างตารางฐานข้อมูลเสร็จสมบูรณ์! พร้อม Import CSV แล้วครับ");
        process.exit(0);

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาด:", error);
        process.exit(1);
    }
}

initializeDatabase();