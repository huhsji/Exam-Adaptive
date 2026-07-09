import React, { useState, useEffect } from 'react';

export default function MockExamMode({ userId }) {
    const [step, setStep] = useState('start'); 
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); 
    const [timeLeft, setTimeLeft] = useState(10800); 
    const [score, setScore] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [reviewFilter, setReviewFilter] = useState('all'); 

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [reviewPage, setReviewPage] = useState(1);
    
    // State สำหรับเปิด/ปิด กระดาษคำตอบบนมือถือ
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        let timerId;
        if (step === 'playing' && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && step === 'playing') {
            alert('หมดเวลาทำข้อสอบ ระบบกำลังส่งคำตอบและประมวลผลคะแนนให้อัตโนมัติครับ');
            executeSubmitExam(); 
        }
        return () => clearInterval(timerId);
    }, [step, timeLeft]);

    useEffect(() => {
        setReviewPage(1);
    }, [reviewFilter]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startExam = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/mock/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            
            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'ยังไม่มีข้อสอบจำลองในระบบครับ');
                return;
            }

            setSessionId(data.session_id);
            setQuestions(data.questions);
            setAnswers({}); 
            setTimeLeft(10800); 
            setCurrentIndex(0);
            setStep('playing');
            setIsMobileSheetOpen(false);
            
        } catch (error) {
            console.error("Error fetching mock exam:", error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    const handleSelectAnswer = (questionId, option) => {
        setAnswers({
            ...answers,
            [questionId]: option
        });
    };

    const executeSubmitExam = async () => {
        setShowSubmitModal(false);

        let totalCorrect = 0;
        questions.forEach((q) => {
            const userAnswer = answers[q.id];
            if (userAnswer) {
                const cleanUserAnswer = userAnswer.trim();
                const correctAnswer = q.correct_answer ? q.correct_answer.trim() : '';
                if (cleanUserAnswer.startsWith(correctAnswer) || cleanUserAnswer === correctAnswer) {
                    totalCorrect += 1;
                }
            }
        });

        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/mock/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    session_id: sessionId, 
                    total_score: totalCorrect 
                })
            });
            
            setScore(totalCorrect);
            setStep('summary');
        } catch (error) {
            console.error("Error submitting exam:", error);
            setScore(totalCorrect);
            setStep('summary');
        }
    };

    const checkIsCorrect = (q) => {
        const userAnswer = answers[q.id];
        if (!userAnswer) return false;
        const cleanUserAnswer = userAnswer.trim();
        const correctAnswer = q.correct_answer ? q.correct_answer.trim() : '';
        return cleanUserAnswer.startsWith(correctAnswer) || cleanUserAnswer === correctAnswer;
    };

    // ฟังก์ชันสำหรับกดเปลี่ยนข้อ
    const handleNavigateQuestion = (idx) => {
        setCurrentIndex(idx);
        setIsMobileSheetOpen(false); // ปิด Popup ตอนกดเลือกข้อ
    };

    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;
    const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

    const filteredQuestions = questions
        .map((q, idx) => ({ ...q, originalIndex: idx + 1 }))
        .filter((q) => {
            const isCorrect = checkIsCorrect(q);
            if (reviewFilter === 'correct') return isCorrect;
            if (reviewFilter === 'incorrect') return !isCorrect;
            return true;
        });

    const totalReviewPages = Math.ceil(filteredQuestions.length / itemsPerPage);
    const currentReviewQuestions = filteredQuestions.slice((reviewPage - 1) * itemsPerPage, reviewPage * itemsPerPage);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', padding: '30px 20px', fontFamily: '"Kanit", sans-serif', position: 'relative' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
                * { box-sizing: border-box; }
                .fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .slide-up { animation: slideUp 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                
                .option-card { transition: all 0.2s ease; border: 1px solid #D1D5DB; border-radius: 8px; cursor: pointer; background: #FFFFFF; display: flex; align-items: flex-start; padding: 16px 20px; }
                .option-card:hover { border-color: #A0AEC0; background: #F8FAFC; }
                .option-card.selected { border-color: #1A365D; background: #EBF4FF; box-shadow: 0 0 0 1px #1A365D; }
                
                .nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; max-height: 380px; overflow-y: auto; padding-right: 5px; }
                .btn-nav { width: 100%; aspect-ratio: 1; border-radius: 6px; border: 1px solid #D1D5DB; background: #FFFFFF; color: #4B5563; font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.15s; }
                .btn-nav:hover { background: #E5E7EB; }
                .btn-nav.answered { background-color: #E2E8F0; border-color: #CBD5E1; color: #1E293B; }
                .btn-nav.current { box-shadow: 0 0 0 2px #1A365D; border-color: #1A365D; background: #FFFFFF; color: #1A365D; font-weight: 600; }
                .btn-nav.answered.current { background: #1A365D; color: #FFFFFF; }

                .filter-tab { padding: 10px 20px; border: 1px solid #D1D5DB; background: #FFFFFF; color: #4B5563; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
                .filter-tab:hover { background: #F3F4F6; }
                .filter-tab.active { background: #1A365D; color: #FFFFFF; border-color: #1A365D; }
                
                .btn-page-nav { padding: 6px 12px; background: white; border: 1px solid #CBD5E1; border-radius: 6px; cursor: pointer; transition: all 0.2s; color: #475569; }
                .btn-page-num { width: 36px; height: 36px; border: 1px solid #D1D5DB; background: white; color: #4B5563; border-radius: 6px; cursor: pointer; font-weight: 500; }
                .btn-page-num.active { background: #1A365D; color: white; border-color: #1A365D; }
                .btn-page-num:disabled, .btn-page-nav:disabled { opacity: 0.4; cursor: not-allowed; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; animation: fadeIn 0.2s ease; }
                .modal-box { background: white; padding: 36px 32px; border-radius: 12px; max-width: 450px; width: 95%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25); animation: slideUp 0.3s ease; border-top: 6px solid #1A365D; }

                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 4px; }
                ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

                .mock-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
                .summary-card { max-width: 600px; margin: 40px auto; padding: 60px 40px; }
                .start-card { max-width: 700px; margin: 40px auto; padding: 50px; }
                
                /* ค่าเริ่มต้นสำหรับ Desktop */
                .mobile-toggle-btn { display: none; }
                .answer-sheet-overlay { display: block; }
                .overlay-backdrop { display: none; }
                .close-sheet-btn { display: none; }
                .answer-sheet-box { background: #FFFFFF; padding: 25px; border-radius: 8px; border: 1px solid #E5E7EB; align-self: start; position: sticky; top: 20px; }
                
                /* การจัดเรียงบนหน้าจอมือถือ (Responsive) */
                @media (max-width: 768px) {
                    .mock-grid { grid-template-columns: 1fr; display: flex; flex-direction: column; }
                    .modal-box { padding: 25px 20px; }
                    .summary-card { padding: 30px 20px; margin: 20px auto; }
                    .start-card { padding: 30px 20px; }
                    .start-card button { width: 100%; }
                    .review-container { padding: 20px; }

                    /* ปุ่ม 3 ขีด มุมขวาล่าง */
                    .mobile-toggle-btn {
                        display: flex; align-items: center; justify-content: center;
                        position: fixed; bottom: 24px; right: 24px; z-index: 900;
                        background: #1A365D; color: white; border: none; border-radius: 50%;
                        width: 56px; height: 56px; box-shadow: 0 4px 12px rgba(26, 54, 93, 0.4);
                        cursor: pointer; transition: transform 0.2s;
                    }
                    .mobile-toggle-btn:active { transform: scale(0.95); }

                    /* ซ่อนกระดาษคำตอบในภาวะปกติ */
                    .answer-sheet-overlay { display: none; }
                    
                    /* เมื่อ Popup เปิดขึ้นมา */
                    .answer-sheet-overlay.is-open {
                        display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        z-index: 99999; /* ปรับให้สูงปรี๊ดเพื่อบังแถบเมนูด้านบนมิด */
                        align-items: flex-end; justify-content: center;
                        animation: fadeIn 0.2s ease;
                    }
                    
                    /* พื้นหลังสีดำเบลอๆ */
                    .overlay-backdrop { display: block; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.65); z-index: -1; }
                    
                    /* กล่องกระดาษคำตอบสีขาว */
                    .answer-sheet-box {
                        width: 100%; position: relative; top: auto;
                        border-radius: 20px 20px 0 0; border: none;
                        max-height: 85vh; padding: 25px 20px;
                        animation: slideUp 0.3s ease;
                        display: flex; flex-direction: column; /* เพื่อให้เลื่อนเฉพาะตรงกลาง */
                        background: #FFFFFF;
                        box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
                    }
                    
                    /* ให้ตัวตารางขยับเลื่อนได้ แต่ปุ่มส่งข้อสอบจะโดนล็อคอยู่ด้านล่าง */
                    .nav-grid {
                        flex: 1; overflow-y: auto; max-height: unset; 
                        margin-bottom: 20px; padding-bottom: 10px;
                    }
                    
                    .close-sheet-btn { display: block; color: #64748B; padding: 5px; }
                }
            `}</style>

            {/* Modal ยืนยันการส่งข้อสอบ */}
            {showSubmitModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        
                        <h3 style={{ margin: '0 0 10px 0', color: '#1A365D', fontSize: '22px', fontWeight: '600' }}>
                            ยืนยันการส่งข้อสอบจำลอง
                        </h3>
                        
                        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                            เมื่อยืนยันแล้ว ระบบจะดำเนินการประมวลผลคะแนนศักยภาพของคุณทันที และจะไม่สามารถกลับมาแก้ไขคำตอบได้อีก
                        </p>

                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '18px 20px', marginBottom: '28px', textAlign: 'left', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#334155' }}>
                                <span>จำนวนข้อสอบทั้งหมด:</span>
                                <strong style={{ color: '#1E293B' }}>{questions.length} ข้อ</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#334155' }}>
                                <span>ตอบเสร็จสิ้นแล้ว:</span>
                                <strong style={{ color: '#1A365D' }}>{answeredCount} ข้อ</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: unansweredCount > 0 ? '#D97706' : '#64748B' }}>
                                <span>ข้ามหรือเว้นว่างไว้:</span>
                                <strong>{unansweredCount} ข้อ</strong>
                            </div>
                            {unansweredCount > 0 && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1', fontSize: '13px', color: '#D97706', lineHeight: '1.5' }}>
                                     ข้อสอบที่ไม่ได้เลือกคำตอบ ระบบจะคำนวณผลเป็น 0 คะแนน
                                </div>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={executeSubmitExam} style={{ padding: '14px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.18)', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                ยืนยันการส่งข้อสอบและประมวลผล
                            </button>
                            
                            <button onClick={() => setShowSubmitModal(false)} style={{ padding: '12px', background: 'white', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.color = '#1E293B'; e.target.style.borderColor = '#94A3B8'; }} onMouseOut={(e) => { e.target.style.background = 'white'; e.target.style.color = '#64748B'; e.target.style.borderColor = '#CBD5E1'; }}>
                                กลับไปทบทวนข้อสอบก่อน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                
                {step === 'start' && (
                    <div className="start-card" style={{ background: '#FFFFFF', borderRadius: '8px', borderTop: '6px solid #1A365D', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        
                        <h2 style={{ color: '#1A365D', fontSize: '28px', margin: '0 0 25px 0', fontWeight: '600' }}>การจำลองสอบเสมือนจริง (Mock Exam)</h2>
                        
                        <div style={{ textAlign: 'left', background: '#F8FAFC', padding: '25px 35px', borderRadius: '6px', borderLeft: '4px solid #D69E2E', color: '#374151', fontSize: '15px', lineHeight: '1.8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>เวลาในการทำข้อสอบ: <strong>3 ชั่วโมง</strong> (ระบบจับเวลาอัตโนมัติ)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                <span>จำนวนข้อสอบ: <strong>100 ข้อ</strong> (ครอบคลุมทุกหมวดวิชาตามสัดส่วน ก.พ.)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                <span>สามารถข้ามไปทำข้ออื่น และย้อนกลับมาแก้ไขคำตอบได้ตลอดเวลา</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                <span>ผลคะแนนและเฉลยละเอียด จะแสดงหลังจากกดยืนยันส่งข้อสอบเท่านั้น</span>
                            </div>
                        </div>
                        
                        <button onClick={startExam} style={{ marginTop: '35px', padding: '14px 45px', fontSize: '16px', cursor: 'pointer', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                            เริ่มสนามจำลองสอบจริง
                        </button>
                    </div>
                )}

                {step === 'playing' && (
                    <div className="mock-grid fade-in">
                        {/* ฝั่งซ้าย: แสดงคำถาม */}
                        <div>
                            <div style={{ marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4B5563', marginBottom: '8px', fontWeight: '500' }}>
                                    <span>สนามสอบจำลอง</span>
                                    <span>ข้อที่ {currentIndex + 1} / {questions.length}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#1A365D', transition: 'width 0.3s ease' }}></div>
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', padding: '35px 20px', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0, color: '#1A365D', fontSize: '20px' }}>ข้อที่ {currentIndex + 1}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', color: timeLeft < 600 ? '#DC2626' : '#1E293B' }}>
                                        {formatTime(timeLeft)}
                                    </div>
                                </div>

                                <div style={{ lineHeight: '1.7', color: '#1F2937', marginBottom: '35px', minHeight: '80px', fontSize: '16px' }}>
                                    {questions[currentIndex]?.question_text}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {questions[currentIndex]?.options.map((option, idx) => {
                                        const isSelected = answers[questions[currentIndex].id] === option;
                                        return (
                                            <label key={idx} className={`option-card ${isSelected ? 'selected' : ''}`}>
                                                <input
                                                    type="radio" name="mock_option" value={option} checked={isSelected}
                                                    onChange={() => handleSelectAnswer(questions[currentIndex].id, option)}
                                                    style={{ margin: '4px 15px 0 0', width: '18px', height: '18px', accentColor: '#1A365D', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ color: '#374151', fontSize: '15px' }}>{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid #F3F4F6', paddingTop: '25px' }}>
                                    <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0} style={{ padding: '10px 20px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', color: currentIndex === 0 ? '#9CA3AF' : '#374151' }}>
                                        ก่อนหน้า
                                    </button>
                                    <button onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))} disabled={currentIndex === questions.length - 1} style={{ padding: '10px 20px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIndex === questions.length - 1 ? 0.5 : 1 }}>
                                        ถัดไป
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ฝั่งขวา (หรือ Popup ในมือถือ): กระดาษคำตอบสลับข้อ */}
                        <div className={`answer-sheet-overlay ${isMobileSheetOpen ? 'is-open' : ''}`}>
                            <div className="overlay-backdrop" onClick={() => setIsMobileSheetOpen(false)}></div>
                            <div className="answer-sheet-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h4 style={{ margin: '0', color: '#1A365D', fontSize: '15px', fontWeight: '600' }}>กระดาษคำตอบ</h4>
                                    <button className="close-sheet-btn" onClick={() => setIsMobileSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '28px', lineHeight: '1', cursor: 'pointer' }}>
                                        &times;
                                    </button>
                                </div>
                                <div className="nav-grid">
                                    {questions.map((q, idx) => (
                                        <button key={idx} onClick={() => handleNavigateQuestion(idx)} className={`btn-nav ${answers[q.id] ? 'answered' : ''} ${currentIndex === idx ? 'current' : ''}`}>
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                                
                                <button onClick={() => { setIsMobileSheetOpen(false); setShowSubmitModal(true); }} style={{ width: '100%', padding: '12px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s', marginTop: 'auto' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                    ส่งข้อสอบคำนวณคะแนน
                                </button>
                            </div>
                        </div>

                        {/* ปุ่ม Hamburger (3 ขีด) แสดงเฉพาะบนมือถือ */}
                        <button className="mobile-toggle-btn" onClick={() => setIsMobileSheetOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                )}

                {step === 'summary' && (
                    <div className="summary-card fade-in" style={{ background: '#FFFFFF', borderRadius: '8px', borderTop: '6px solid #1A365D', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h2 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '24px' }}>สิ้นสุดการทดสอบ Mock Exam</h2>
                        <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '35px', margin: '20px 0' }}>
                            <div style={{ fontSize: '56px', color: '#1A365D', fontWeight: '600' }}>{score} <span style={{ fontSize: '20px', color: '#94A3B8' }}>/ {questions.length} ข้อ</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => setStep('start')} style={{ padding: '12px 25px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>กลับหน้าหลัก</button>
                            <button onClick={() => setStep('review')} style={{ padding: '12px 35px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>ดูเฉลยละเอียดรายข้อ</button>
                        </div>
                    </div>
                )}

                {step === 'review' && (
                    <div className="review-container fade-in" style={{ background: '#FFFFFF', padding: '40px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <h2 style={{ color: '#1A365D', margin: 0, fontSize: '22px' }}>เฉลยละเอียดการสอบชุดใหญ่</h2>
                                <p style={{ color: '#6B7280', margin: '5px 0 0 0', fontSize: '14px' }}>วิเคราะห์คำตอบและเจาะลึกคำอธิบายเพื่ออุดรอยรั่ว</p>
                            </div>
                            <button onClick={() => setStep('summary')} style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#4B5563', height: 'fit-content' }}>กลับ</button>
                        </div>

                        <div className="filter-group">
                            <button className={`filter-tab ${reviewFilter === 'all' ? 'active' : ''}`} onClick={() => setReviewFilter('all')}>ทั้งหมด ({questions.length})</button>
                            <button className={`filter-tab ${reviewFilter === 'correct' ? 'active' : ''}`} onClick={() => setReviewFilter('correct')}>เฉพาะข้อที่ถูก ({score})</button>
                            <button className={`filter-tab ${reviewFilter === 'incorrect' ? 'active' : ''}`} onClick={() => setReviewFilter('incorrect')}>เฉพาะข้อที่ผิด ({questions.length - score})</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {currentReviewQuestions.map((q) => {
                                const isCorrect = checkIsCorrect(q);
                                const userAns = answers[q.id];

                                return (
                                    <div key={q.id} style={{ padding: '24px', borderRadius: '6px', borderLeft: `4px solid ${isCorrect ? '#10B981' : '#EF4444'}`, background: '#F8FAFC', border: '1px solid #E2E8F0', borderTop: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{ fontWeight: '600', color: isCorrect ? '#059669' : '#B91C1C', fontSize: '16px', minWidth: '45px' }}>ข้อ {q.originalIndex}.</div>
                                            <div style={{ color: '#1F2937', fontWeight: '500', lineHeight: '1.6' }}>{q.question_text}</div>
                                        </div>
                                        
                                        <div style={{ paddingLeft: '57px', fontSize: '14px', color: '#4B5563' }}>
                                            <div style={{ margin: '4px 0' }}>คำตอบของคุณ: <span style={{ color: isCorrect ? '#059669' : '#B91C1C', fontWeight: '600' }}>{userAns || 'ไม่ได้ฝนคำตอบ'}</span></div>
                                            {!isCorrect && <div style={{ margin: '4px 0' }}>เฉลยที่ถูกต้อง: <span style={{ color: '#059669', fontWeight: '600' }}>{q.correct_answer}</span></div>}
                                            
                                            <div style={{ marginTop: '15px', background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <div style={{ color: '#1A365D', fontWeight: '600', marginBottom: '5px' }}>คำอธิบาย:</div>
                                                <div style={{ lineHeight: '1.6' }}>{q.explanation || 'ผู้เขียนข้อสอบไม่ได้ระบุคำอธิบาย'}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalReviewPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '35px', borderTop: '1px solid #E5E7EB', paddingTop: '20px', flexWrap: 'wrap' }}>
                                <button className="btn-page-nav" onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}>
                                    ก่อนหน้า
                                </button>
                                {[...Array(totalReviewPages)].map((_, idx) => (
                                    <button key={idx} className={`btn-page-num ${reviewPage === idx + 1 ? 'active' : ''}`} onClick={() => setReviewPage(idx + 1)}>
                                        {idx + 1}
                                    </button>
                                ))}
                                <button className="btn-page-nav" onClick={() => setReviewPage(p => Math.min(totalReviewPages, p + 1))} disabled={reviewPage === totalReviewPages}>
                                    ถัดไป
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}