import React, { useState, useEffect } from 'react';

export default function PracticeMode() {
    const [step, setStep] = useState('select_category'); 
    
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [parts, setParts] = useState([]);
    const [selectedPart, setSelectedPart] = useState(null);

    const [sessionId, setSessionId] = useState(null);
    const [questionData, setQuestionData] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    
    // เก็บประวัติการตอบและเฉลยไว้โชว์ตอนจบ
    const [examHistory, setExamHistory] = useState([]); 

    const userId = 1; // 💡 สมมติ userId ก่อน (เชื่อมระบบ Login จริงภายหลัง)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // 💡 จุดที่แก้ไข 1: ส่ง userId ไปให้ API คำนวณ % ความคืบหน้าของคนนั้น
                const res = await fetch(`http://localhost:5000/api/practice/categories?user_id=${userId}`);
                const data = await res.json();
                
                // ตรวจสอบ Error จาก API ก่อน set state
                if (res.ok) {
                    setCategories(data);
                } else {
                    console.error("API Error:", data.error);
                    // อาจจะเพิ่ม alert หรือระบบแจ้งเตือนกรณีข้อมูลมีปัญหา
                }
                
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, [userId]); // เพิ่ม userId ใน dependency array

    const handleSelectCategory = async (categoryName) => {
        setSelectedCategory(categoryName);
        try {
            const res = await fetch(`http://localhost:5000/api/practice/parts?category=${categoryName}`);
            const data = await res.json();
            setParts(data);
            setStep('select_part');
        } catch (error) {
            console.error("Error fetching parts:", error);
        }
    };

    const handleSelectPart = (part) => {
        setSelectedPart(part);
        setStep('start');
    };

    const startSession = async () => {
        try {
            setExamHistory([]); 
            const res = await fetch('http://localhost:5000/api/practice/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, part_id: selectedPart.id }) 
            });
            const data = await res.json();
            
            if (data.session_id) {
                setSessionId(data.session_id);
                fetchQuestion(data.session_id); 
            }
        } catch (error) {
            console.error("Error starting session:", error);
        }
    };

    const fetchQuestion = async (currentSessionId) => {
        setSelectedAnswer(''); 

        try {
            const res = await fetch(`http://localhost:5000/api/practice/question?user_id=${userId}&part_id=${selectedPart.id}&session_id=${currentSessionId}`);
            const data = await res.json();

            if (!res.ok) {
                alert(`⚠️ ${data.error || "ขออภัยครับ ยังไม่มีข้อสอบในระบบสำหรับวิชานี้"}`);
                setStep('select_part');
                return; 
            }

            if (data.is_finished) {
                setStep('summary'); 
            } else {
                setQuestionData(data);
                setStep('playing');
            }
        } catch (error) {
            console.error("Error fetching question:", error);
        }
    };

    const submitAnswer = async () => {
        if (!selectedAnswer) return alert("กรุณาเลือกคำตอบก่อนครับ!");

        try {
            const res = await fetch('http://localhost:5000/api/practice/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    session_id: sessionId,
                    question_id: questionData.question.id,
                    part_id: selectedPart.id, 
                    user_answer: selectedAnswer
                })
            });
            const feedbackData = await res.json();
            
            setExamHistory(prev => [...prev, {
                question: questionData.question,
                user_answer: selectedAnswer,
                feedback: feedbackData
            }]);

            if (feedbackData.is_finished) {
                setStep('summary');
            } else {
                fetchQuestion(sessionId);
            }

        } catch (error) {
            console.error("Error submitting answer:", error);
        }
    };

    // คำนวณ Progress สำหรับหลอดคะแนนโหมดฝึกซ้อม
    const currentProgress = questionData ? ((questionData.question_number - 1) / 20) * 100 : 0;

    // ================= UI RENDERING ================= //
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', padding: '30px 20px', fontFamily: '"Kanit", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
                * { box-sizing: border-box; }
                .fade-in { animation: fadeIn 0.4s ease-out forwards; }
                .slide-up { animation: slideUp 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                
                .card-hover { transition: all 0.2s ease-in-out; border: 1px solid #E5E7EB; background: #FFFFFF; }
                .card-hover:hover { border-color: #A0AEC0; transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                
                .option-card { transition: all 0.2s ease; border: 1px solid #D1D5DB; border-radius: 8px; cursor: pointer; background: #FFFFFF; display: flex; align-items: flex-start; padding: 16px 20px; }
                .option-card:hover { border-color: #A0AEC0; background: #F8FAFC; }
                .option-card.selected { border-color: #1A365D; background: #EBF4FF; box-shadow: 0 0 0 1px #1A365D; }
                
                .main-container { max-width: 750px; margin: 0 auto; background: #FFFFFF; padding: 40px; border-radius: 8px; border-top: 6px solid #1A365D; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            `}</style>

            <div className="main-container slide-up">
                
                {/* 📍 หน้า 1: เลือกหมวดวิชาหลัก (อัปเดตเพิ่ม UI โชว์เปอร์เซ็นต์) */}
                {step === 'select_category' && (
                    <div className="fade-in">
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            <h2 style={{ color: '#1A365D', margin: '0', fontSize: '24px', fontWeight: '600' }}>เลือกหมวดวิชาหลัก</h2>
                            <p style={{ color: '#6B7280', marginTop: '8px', fontSize: '15px' }}>เลือกหมวดหมู่ข้อสอบที่ต้องการฝึกฝน</p>
                        </div>

                        {categories.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>กำลังโหลดข้อมูล...</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                {/* 💡 จุดที่แก้ไข 2: นำข้อมูล % มาแสดงผล */}
                                {categories.map((category, index) => {
                                    // เช็กว่าคะแนนเกินเกณฑ์ผ่านที่ ก.พ. กำหนดไว้หรือไม่
                                    const isPassed = category.percentage >= category.passing_criteria;
                                    
                                    return (
                                        <div 
                                            key={index} className="card-hover" onClick={() => handleSelectCategory(category.name)}
                                            style={{ padding: '24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '6px', marginRight: '15px' }}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                </div>
                                                <div style={{ flex: 1, paddingRight: '20px' }}>
                                                    <h3 style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '18px', fontWeight: '500' }}>{category.name}</h3>
                                                    
                                                    {/* หลอดเปอร์เซ็นต์ความพร้อม (Readiness Progress Bar) */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ 
                                                                width: `${Math.min(category.percentage, 100)}%`, // กันเปอร์เซ็นต์ทะลุ 100 
                                                                height: '100%', 
                                                                background: isPassed ? '#10B981' : '#F59E0B', // ผ่าน = สีเขียว, ไม่ผ่าน = สีส้ม
                                                                transition: 'width 0.5s ease-in-out' 
                                                            }}></div>
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: isPassed ? '#10B981' : '#F59E0B' }}>
                                                            {category.percentage}%
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                                                        เป้าหมายเกณฑ์ผ่าน: {category.passing_criteria}% (มีเนื้อหาทั้งหมด {category.total_parts} พาร์ทย่อย)
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 📍 หน้า 2: เลือกพาร์ทย่อย */}
                {step === 'select_part' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #E5E7EB', paddingBottom: '20px' }}>
                            <button onClick={() => setStep('select_category')} style={{ display: 'flex', alignItems: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#4B5563', marginRight: '20px', transition: 'background 0.2s' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                กลับไปหมวดวิชาหลัก
                            </button>
                            <div>
                                <h2 style={{ color: '#1A365D', margin: '0', fontSize: '22px', fontWeight: '600' }}>เลือกพาร์ทที่ต้องการฝึก</h2>
                                <p style={{ color: '#6B7280', margin: '4px 0 0 0', fontSize: '14px' }}>หมวด: {selectedCategory}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {parts.map((part) => (
                                <div key={part.id} className="card-hover" onClick={() => handleSelectPart(part)} style={{ padding: '20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <div style={{ background: '#EBF4FF', padding: '10px', borderRadius: '6px', marginRight: '15px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    </div>
                                    <h3 style={{ margin: '0', color: '#1F2937', fontSize: '16px', fontWeight: '500' }}>{part.part_name}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 📍 หน้า 3: ปุ่มกดเริ่ม */}
                {step === 'start' && (
                    <div className="fade-in" style={{ textAlign: 'center', padding: '30px 0' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                        </svg>
                        
                        <h2 style={{ color: '#1A365D', margin: '0 0 15px 0', fontSize: '26px', fontWeight: '600' }}>เตรียมฝึกทำข้อสอบ</h2>
                        
                        <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #D69E2E', display: 'inline-block', textAlign: 'left', marginBottom: '35px' }}>
                            <h3 style={{ color: '#1F2937', margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>วิชา: {selectedPart?.part_name}</h3>
                            <ul style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                                <li>ระบบจะสุ่มข้อสอบมาให้ <strong>20 ข้อ</strong></li>
                                <li>ระดับความยากจะ <strong>ปรับอัตโนมัติ (Adaptive)</strong> ตามความแม่นยำของคุณ</li>
                                <li>ระบบจะสรุปคะแนนและแสดงเฉลยเมื่อทำครบทุกข้อ</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button onClick={() => setStep('select_part')} style={{ padding: '12px 25px', cursor: 'pointer', background: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', borderRadius: '6px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#F3F4F6'} onMouseOut={(e) => e.target.style.background = '#FFFFFF'}>
                                กลับไปเลือกวิชา
                            </button>
                            <button onClick={startSession} style={{ padding: '12px 35px', cursor: 'pointer', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '500', transition: 'background 0.2s', display: 'flex', alignItems: 'center' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                เริ่มทำข้อสอบ
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* 📍 หน้า 4: กำลังทำข้อสอบ */}
                {step === 'playing' && (
                    <div className="fade-in">
                        {!questionData ? (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: '#6B7280' }}>
                                <svg className="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px', animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                                <div>กำลังโหลดข้อสอบ...</div>
                                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            </div>
                        ) : (
                            <>
                                {/* แถบความคืบหน้า (Progress Bar) */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4B5563', marginBottom: '8px', fontWeight: '500' }}>
                                        <span>โหมดฝึกซ้อม</span>
                                        <span>ข้อที่ {questionData?.question_number} / 20</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${currentProgress}%`, height: '100%', background: '#1A365D', transition: 'width 0.4s ease' }}></div>
                                    </div>
                                </div>

                                <h3 style={{ lineHeight: '1.7', color: '#1F2937', marginBottom: '30px', fontSize: '18px', fontWeight: 'normal' }}>
                                    {questionData?.question?.question_text.replace(/^\d+\s*[).]\s*/, '')}
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {questionData?.question?.options.map((option, index) => {
                                        const isSelected = selectedAnswer === option;
                                        return (
                                            <label key={index} className={`option-card ${isSelected ? 'selected' : ''}`}>
                                                <input
                                                    type="radio" name="exam_option" value={option} checked={isSelected}
                                                    onChange={(e) => setSelectedAnswer(e.target.value)}
                                                    style={{ margin: '4px 15px 0 0', width: '18px', height: '18px', accentColor: '#1A365D', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6' }}>{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                <button 
                                    className="slide-up" onClick={submitAnswer} disabled={!selectedAnswer}
                                    style={{ marginTop: '35px', width: '100%', padding: '14px', background: selectedAnswer ? '#1A365D' : '#E5E7EB', color: selectedAnswer ? '#FFFFFF' : '#9CA3AF', fontSize: '16px', fontWeight: '500', border: 'none', borderRadius: '6px', cursor: selectedAnswer ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                                    ยืนยันคำตอบ และไปข้อถัดไป
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* 📍 หน้า 5: หน้าสรุปผล */}
                {step === 'summary' && (
                    <div className="fade-in" style={{ textAlign: 'center', padding: '30px 0' }}>
                        {/* โชว์ไอคอนและสีตามสถานะ ผ่าน/ไม่ผ่าน */}
                        {examHistory[examHistory.length - 1]?.feedback?.summary?.is_passed ? (
                            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px' }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        ) : (
                            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        )}
                        
                        <h2 style={{ color: examHistory[examHistory.length - 1]?.feedback?.summary?.is_passed ? '#10B981' : '#EF4444', margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>
                            {examHistory[examHistory.length - 1]?.feedback?.summary?.is_passed ? 'ยินดีด้วย! คุณสอบผ่านเกณฑ์' : 'พยายามเข้านะ! คุณยังไม่ผ่านเกณฑ์'}
                        </h2>
                        <p style={{ color: '#6B7280', margin: '0 0 30px 0', fontSize: '15px' }}>
                            เกณฑ์การผ่านของวิชานี้สำหรับวุฒิของคุณคือ {examHistory[examHistory.length - 1]?.feedback?.summary?.passing_criteria}%
                        </p>
                        
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '30px', margin: '0 auto 35px auto', maxWidth: '350px' }}>
                            <div style={{ fontSize: '15px', color: '#4B5563', fontWeight: '500' }}>คะแนนศักยภาพ (Proficiency Score)</div>
                            <div style={{ fontSize: '56px', color: '#1A365D', fontWeight: '600', margin: '10px 0', lineHeight: '1' }}>
                                {examHistory[examHistory.length - 1]?.feedback?.summary?.percentage} <span style={{fontSize: '24px', color: '#9CA3AF'}}>%</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                ตอบถูก {examHistory.filter(h => h.feedback.is_correct).length} จาก 20 ข้อ
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button onClick={() => { 
                                setStep('select_category'); 
                                setSelectedCategory(null); 
                                setSelectedPart(null); 
                                // เพิ่มการ fetch ข้อมูลเปอร์เซ็นต์ใหม่ เมื่อกลับหน้าหลัก
                                fetch(`http://localhost:5000/api/practice/categories?user_id=${userId}`)
                                    .then(res => res.json())
                                    .then(data => setCategories(data));
                            }} style={{ flex: 1, padding: '12px 20px', cursor: 'pointer', background: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '15px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#F3F4F6'} onMouseOut={(e) => e.target.style.background = '#FFFFFF'}>
                                กลับหน้าหลัก
                            </button>
                            <button onClick={() => setStep('review')} style={{ flex: 2, padding: '12px 20px', cursor: 'pointer', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                ตรวจสอบเฉลย
                            </button>
                        </div>
                    </div>
                )}

                {/* 📍 หน้า 6: หน้าดูเฉลยย้อนหลัง */}
                {step === 'review' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #E5E7EB', paddingBottom: '20px' }}>
                            <h2 style={{ color: '#1A365D', margin: 0, fontSize: '22px', fontWeight: '600' }}>ทบทวนเฉลยรายข้อ</h2>
                            <button onClick={() => setStep('summary')} style={{ display: 'flex', alignItems: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#4B5563' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                กลับ
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {examHistory.map((item, index) => {
                                const isCorrect = item.feedback.is_correct;
                                return (
                                    <div key={index} style={{ padding: '24px', borderRadius: '6px', borderLeft: `4px solid ${isCorrect ? '#10B981' : '#EF4444'}`, background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                                        
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{ fontWeight: '600', color: isCorrect ? '#059669' : '#B91C1C', fontSize: '16px', minWidth: '45px' }}>ข้อ {index + 1}.</div>
                                            <div style={{ color: '#1F2937', fontWeight: '500', fontSize: '15px', lineHeight: '1.6' }}>
                                                {item.question.question_text.replace(/^\d+\s*[).]\s*/, '')}
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginLeft: '57px', fontSize: '14px', lineHeight: '1.8', color: '#4B5563' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
                                                <span style={{ width: '110px', color: '#6B7280' }}>คำตอบของคุณ:</span> 
                                                <span style={{ color: isCorrect ? '#059669' : '#B91C1C', fontWeight: '500' }}>{item.user_answer}</span>
                                            </div>
                                            
                                            {!isCorrect && (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
                                                    <span style={{ width: '110px', color: '#6B7280' }}>เฉลยที่ถูกต้อง:</span> 
                                                    <span style={{ color: '#059669', fontWeight: '500' }}>{item.feedback.correct_answer}</span>
                                                </div>
                                            )}

                                            <div style={{ marginTop: '20px', background: '#FFFFFF', padding: '16px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#1A365D', fontWeight: '600', marginBottom: '8px' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                                    คำอธิบาย
                                                </div>
                                                <div style={{ color: '#374151', lineHeight: '1.6' }}>
                                                    {item.feedback.explanation || 'ผู้เขียนข้อสอบไม่ได้ระบุคำอธิบายสำหรับข้อนี้'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}