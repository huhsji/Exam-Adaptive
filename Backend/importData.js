const XLSX = require('xlsx');
const db = require('./db');

async function importExamData() {
    // 🎯 ใส่ชื่อไฟล์ของพี่ (อย่าลืมเปลี่ยนเป็นไฟล์ที่ต้องการนำเข้าครับ)
    const fileName = 'Mock กพ.xlsx'; 
    console.log(`⏳ กำลังเริ่มนำเข้าข้อมูลข้อสอบจากไฟล์ Excel: ${fileName}...`);

    try {
        const workbook = XLSX.readFile(fileName);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const results = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;

        for (const row of results) {
            const category = row['category']?.toString().trim();
            const partName = row['part_name']?.toString().trim(); 
            const difficulty = row['difficulty_level'] || 2;
            const questionText = row['question_text']?.toString().trim();
            
            let optionA = row['option_a']?.toString().trim() || null;
            let optionB = row['option_b']?.toString().trim() || null;
            let optionC = row['option_c']?.toString().trim() || null;
            let optionD = row['option_d']?.toString().trim() || null;
            let correctAnswer = row['correct_answer']?.toString().trim() || null;
            let examYear = row['exam_year']?.toString().trim() || '2560';
            let explanation = row['explanation']?.toString().trim() || null;

            if (!questionText || !partName) continue;

            // 🌟 พระเอกอยู่ตรงนี้: ดักจับบรรทัดที่ช้อยส์ยังเป็นก้อน JSON
            if (optionA && optionA.startsWith('[') && optionA.endsWith(']')) {
                try {
                    // แปลงก้อน JSON เป็น Array แล้วจับแยกช่องให้
                    const parsedOptions = JSON.parse(optionA.replace(/""/g, '"')); 
                    
                    // กู้คืนข้อมูลที่เลื่อนช่องผิดเพราะ Excel ดันมา
                    const actualCorrectAnswer = optionB; // เฉลยดันไปอยู่ช่อง B
                    const actualExamYear = optionC;      // ปีดันไปอยู่ช่อง C
                    const actualExplanation = optionD;   // คำอธิบายดันไปอยู่ช่อง D

                    // จัดเรียงใหม่ให้ถูกต้องเป๊ะๆ
                    optionA = parsedOptions[0] || null;
                    optionB = parsedOptions[1] || null;
                    optionC = parsedOptions[2] || null;
                    optionD = parsedOptions[3] || null;
                    correctAnswer = actualCorrectAnswer;
                    examYear = actualExamYear;
                    explanation = actualExplanation;
                } catch (e) {
                    console.log(`⚠️ ข้ามข้อเนื่องจากแปลงช้อยส์ไม่ได้: ${questionText}`);
                    continue;
                }
            }

            // ถ้าไม่มีเฉลยจริงๆ ให้ข้ามไป จะได้ไม่พัง
            if (!correctAnswer) {
                console.log(`⚠️ ข้ามข้อที่ไม่มีเฉลย: ${questionText.substring(0, 30)}...`);
                continue;
            }

            // บันทึกตาราง parts
            await db.query(`INSERT IGNORE INTO parts (part_name, category) VALUES (?, ?)`, [partName, category]);
            const [partData] = await db.query(`SELECT id FROM parts WHERE part_name = ?`, [partName]);
            if (partData.length === 0) continue; 
            const partId = partData[0].id;

            // บันทึกตาราง questions
            await db.query(
                `INSERT INTO questions 
                (part_id, difficulty_level, question_text, option_a, option_b, option_c, option_d, correct_answer, exam_year, explanation) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [partId, difficulty, questionText, optionA, optionB, optionC, optionD, correctAnswer, examYear, explanation]
            );
            successCount++;
        }

        console.log(`\n✅ นำเข้าข้อสอบสำเร็จทั้งหมด ${successCount} ข้อ! โคตรตึง!`);
        process.exit(0);

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดตอนนำเข้าข้อมูล:", error);
        process.exit(1);
    }
}

importExamData();