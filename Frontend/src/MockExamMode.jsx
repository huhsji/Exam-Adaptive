import React, { useState, useEffect } from 'react';

//  [แก้ไข 1] รับค่า userId ผ่าน props (แทนการพิมพ์เลข 1)
export default function MockExamMode({ userId }) {
    const [step, setStep] = useState('start'); 
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); 
    const [timeLeft, setTimeLeft] = useState(10800); 
    const [score, setScore] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [reviewFilter, setReviewFilter] = useState('all'); 

    

    // ⏱ ระบบจับเวลาถอยหลัง (คงลอจิกเดิม)
    useEffect(() => {
        let timerId;
        if (step === 'playing' && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && step === 'playing') {
            alert('หมดเวลาสอบ! ระบบกำลังส่งคำตอบอัตโนมัติ');
            submitExam(true); 
        }
        return () => clearInterval(timerId);
    }, [step, timeLeft]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startExam = async () => {
        try {
            const res = await fetch(`http://localhost:5000/mock/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }) // 🟢 ใช้ userId ของจริงตรงนี้
            });
            
            const data = await res.json();

            if (!res.ok) {
                alert(`⚠️ ${data.error || 'ยังไม่มีข้อสอบจำลองในระบบครับ'}`);
                return;
            }

            setSessionId(data.session_id);
            setQuestions(data.questions);
            setAnswers({}); 
            setTimeLeft(10800); 
            setCurrentIndex(0);
            setStep('playing');
            
        } catch (error) {
            console.error("Error fetching mock exam:", error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    };

    const handleSelectAnswer = (questionId, option) => {
        setAnswers({
            ...answers,
            [questionId]: option
        });
    };

    const submitExam = async (isForceSubmit = false) => {
        if (!isForceSubmit) {
            const confirmSubmit = window.confirm('คุณต้องการส่งข้อสอบใช่หรือไม่? (ข้อที่ไม่ได้เลือกจะไม่ได้คะแนน)');
            if (!confirmSubmit) return;
        }

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
            await fetch(`http://localhost:5000/mock/submit`, {
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
            alert("ส่งข้อสอบไม่สำเร็จ แต่ระบบคำนวณคะแนนหน้าบ้านให้เรียบร้อยแล้วครับ");
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

    // คำนวณ % ความคืบหน้าสำหรับ Progress Bar
    const progressPercentage = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;

    // ================= UI RENDERING ================= //
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', padding: '30px 20px', fontFamily: '"Kanit", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
                * { box-sizing: border-box; }
                
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
                
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 4px; }
                ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
            `}</style>

            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                
                {/* 📍 หน้า 1: รายละเอียดก่อนเริ่มสอบ */}
                {step === 'start' && (
                    <div style={{ background: '#FFFFFF', padding: '50px', borderRadius: '8px', borderTop: '6px solid #1A365D', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', textAlign: 'center', maxWidth: '700px', margin: '40px auto' }}>
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
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>เวลาในการทำข้อสอบ: <strong>3 ชั่วโมง</strong> (ระบบจับเวลาอัตโนมัติ)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                <span>จำนวนข้อสอบ: <strong>100 ข้อ</strong> (ครอบคลุมทุกหมวดวิชาตามสัดส่วน ก.พ.)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                <span>สามารถข้ามไปทำข้ออื่น และย้อนกลับมาแก้ไขคำตอบได้ตลอดเวลา</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                <span>ผลคะแนนและเฉลยละเอียด จะแสดงหลังจากกดยืนยันส่งข้อสอบเท่านั้น</span>
                            </div>
                        </div>
                        
                        <button onClick={startExam} style={{ marginTop: '35px', padding: '14px 45px', fontSize: '16px', cursor: 'pointer', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                            เริ่มทำข้อสอบ
                        </button>
                    </div>
                )}

                {/* 📍 หน้า 2: หน้ากำลังทำข้อสอบ */}
                {step === 'playing' && questions.length > 0 && (
                    <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start', flexDirection: window.innerWidth < 800 ? 'column' : 'row' }}>
                        
                        {/* ฝั่งซ้าย: กล่องโจทย์ข้อสอบ */}
                        <div style={{ flex: '1', width: '100%' }}>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                                    <span>ความคืบหน้า</span>
                                    <span>{Object.keys(answers).length} / {questions.length} ข้อ</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#1A365D', transition: 'width 0.3s ease' }}></div>
                                </div>
                            </div>

                            <div style={{ background: '#FFFFFF', padding: '35px', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #F3F4F6', paddingBottom: '20px' }}>
                                    <h3 style={{ margin: 0, color: '#1A365D', fontSize: '20px', fontWeight: '500' }}>ข้อที่ {currentIndex + 1}</h3>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', color: timeLeft < 300 ? '#DC2626' : '#1E293B', padding: '8px 16px', borderRadius: '6px', fontWeight: '500', fontSize: '16px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        {formatTime(timeLeft)}
                                    </div>
                                </div>

                                <div style={{ lineHeight: '1.7', color: '#1F2937', marginBottom: '35px', minHeight: '80px', fontSize: '16px' }}>
                                    {questions[currentIndex].question_text}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {questions[currentIndex].options.map((option, index) => {
                                        const isSelected = answers[questions[currentIndex].id] === option;
                                        return (
                                            <label key={index} className={`option-card ${isSelected ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="mock_option"
                                                    value={option}
                                                    checked={isSelected}
                                                    onChange={() => handleSelectAnswer(questions[currentIndex].id, option)}
                                                    style={{ margin: '4px 15px 0 0', width: '18px', height: '18px', accentColor: '#1A365D', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6' }}>{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid #F3F4F6', paddingTop: '25px' }}>
                                    <button 
                                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentIndex === 0}
                                        style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', background: '#FFFFFF', color: currentIndex === 0 ? '#9CA3AF' : '#4B5563', border: '1px solid', borderColor: currentIndex === 0 ? '#E5E7EB' : '#D1D5DB', borderRadius: '6px', fontWeight: '500', transition: 'background 0.2s' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                        ข้อก่อนหน้า
                                    </button>
                                    <button 
                                        onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                        disabled={currentIndex === questions.length - 1}
                                        style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer', background: currentIndex === questions.length - 1 ? '#E5E7EB' : '#1A365D', color: currentIndex === questions.length - 1 ? '#9CA3AF' : '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '500', transition: 'background 0.2s' }}>
                                        ข้อถัดไป
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ฝั่งขวา: แผงควบคุมกระดาษคำตอบ */}
                        <div style={{ width: window.innerWidth < 800 ? '100%' : '300px', background: '#FFFFFF', padding: '25px', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', position: 'sticky', top: '20px', flexShrink: 0 }}>
                            <h4 style={{ margin: '0 0 20px 0', color: '#1A365D', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                                กระดาษคำตอบ
                            </h4>
                            
                            <div className="nav-grid">
                                {questions.map((q, index) => {
                                    const isAnswered = answers[q.id] !== undefined;
                                    const isCurrent = currentIndex === index;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentIndex(index)}
                                            className={`btn-nav ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                                            title={`ไปที่ข้อ ${index + 1}`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={() => submitExam(false)}
                                style={{ width: '100%', marginTop: '25px', padding: '12px', background: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '500', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#059669'} onMouseOut={(e) => e.target.style.background = '#10B981'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                ส่งข้อสอบ
                            </button>
                        </div>
                    </div>
                )}

                {/* 📍 หน้า 3: หน้าสรุปคะแนน */}
                {step === 'summary' && (
                    <div style={{ background: '#FFFFFF', padding: '60px 40px', borderRadius: '8px', borderTop: '6px solid #1A365D', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', maxWidth: '600px', margin: '40px auto' }}>
                        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                            <circle cx="12" cy="8" r="7"></circle>
                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                        </svg>
                        <h2 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '24px', fontWeight: '600' }}>สิ้นสุดการทำข้อสอบ</h2>
                        <p style={{ color: '#6B7280', margin: '0 0 30px 0', fontSize: '15px' }}>ระบบได้บันทึกผลการทดสอบของคุณเรียบร้อยแล้ว</p>
                        
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '35px', margin: '0 auto 40px auto' }}>
                            <div style={{ fontSize: '14px', color: '#4B5563', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>คะแนนรวมที่ได้</div>
                            <div style={{ fontSize: '64px', color: '#1A365D', fontWeight: '600', margin: '10px 0', lineHeight: '1' }}>
                                {score} <span style={{fontSize: '24px', color: '#9CA3AF'}}>/ 100</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#6B7280', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                <span><span style={{color: '#10B981'}}>●</span> ตอบถูก {score} ข้อ</span>
                                <span><span style={{color: '#EF4444'}}>●</span> พลาด/ว่าง {100 - score} ข้อ</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button 
                                onClick={() => window.location.reload()} 
                                style={{ flex: 1, padding: '12px 20px', cursor: 'pointer', background: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '15px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#F3F4F6'} onMouseOut={(e) => e.target.style.background = '#FFFFFF'}>
                                กลับหน้าหลัก
                            </button>
                            <button 
                                onClick={() => setStep('review')} 
                                style={{ flex: 2, padding: '12px 20px', cursor: 'pointer', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                ดูเฉลยละเอียด
                            </button>
                        </div>
                    </div>
                )}

                {/* หน้า 4: เฉลยละเอียด */}
                {step === 'review' && (
                    <div style={{ background: '#FFFFFF', padding: '40px', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                            <div>
                                <h2 style={{ color: '#1A365D', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '600' }}>เฉลยละเอียดระดับห้องสอบ</h2>
                                <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>วิเคราะห์ข้อสอบที่คุณทำผิดเพื่อปิดจุดบอด</p>
                            </div>
                            <button 
                                onClick={() => setStep('summary')} 
                                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#4B5563', display: 'flex', alignItems: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                กลับ
                            </button>
                        </div>

                        {/* แท็บคัดกรอง */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #E5E7EB', paddingBottom: '20px' }}>
                            <button className={`filter-tab ${reviewFilter === 'all' ? 'active' : ''}`} onClick={() => setReviewFilter('all')}>ทั้งหมด (100)</button>
                            <button className={`filter-tab ${reviewFilter === 'correct' ? 'active' : ''}`} onClick={() => setReviewFilter('correct')}>ข้อที่ถูก ({score})</button>
                            <button className={`filter-tab ${reviewFilter === 'incorrect' ? 'active' : ''}`} onClick={() => setReviewFilter('incorrect')}>ข้อที่ผิด ({100 - score})</button>
                        </div>

                        {/* รายการข้อสอบ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {questions.map((q, index) => {
                                const isCorrect = checkIsCorrect(q);
                                const userAns = answers[q.id];

                                if (reviewFilter === 'correct' && !isCorrect) return null;
                                if (reviewFilter === 'incorrect' && isCorrect) return null;

                                return (
                                    <div key={q.id} style={{ padding: '24px', borderRadius: '6px', borderLeft: `4px solid ${isCorrect ? '#10B981' : '#EF4444'}`, background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                                        
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{ fontWeight: '600', color: isCorrect ? '#059669' : '#B91C1C', fontSize: '16px', minWidth: '45px' }}>ข้อ {index + 1}.</div>
                                            <div style={{ color: '#1F2937', fontWeight: '500', fontSize: '15px', lineHeight: '1.6' }}>{q.question_text}</div>
                                        </div>
                                        
                                        <div style={{ marginLeft: '57px', fontSize: '14px', lineHeight: '1.8', color: '#4B5563' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
                                                <span style={{ width: '110px', color: '#6B7280' }}>คำตอบของคุณ:</span> 
                                                {userAns ? (
                                                    <span style={{ color: isCorrect ? '#059669' : '#B91C1C', fontWeight: '500' }}>{userAns}</span>
                                                ) : (
                                                    <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>ไม่ได้ระบุคำตอบ</span>
                                                )}
                                            </div>
                                            
                                            {!isCorrect && (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', margin: '6px 0' }}>
                                                    <span style={{ width: '110px', color: '#6B7280' }}>เฉลยที่ถูกต้อง:</span> 
                                                    <span style={{ color: '#059669', fontWeight: '500' }}>{q.correct_answer}</span>
                                                </div>
                                            )}

                                            <div style={{ marginTop: '20px', background: '#FFFFFF', padding: '16px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#1A365D', fontWeight: '600', marginBottom: '8px' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                                    คำอธิบาย
                                                </div>
                                                <div style={{ color: '#374151', lineHeight: '1.6' }}>
                                                    {q.explanation || 'ผู้เขียนข้อสอบไม่ได้ระบุคำอธิบายสำหรับข้อนี้'}
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