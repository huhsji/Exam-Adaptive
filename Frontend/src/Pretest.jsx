import React, { useState, useEffect } from 'react';

const Pretest = ({ userId, onComplete }) => {
    const [viewState, setViewState] = useState('intro'); 
    const [parts, setParts] = useState([]);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [step, setStep] = useState(1);
    const [question, setQuestion] = useState(null);
    const [isStep1Correct, setIsStep1Correct] = useState(null);
    const [results, setResults] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedOption, setSelectedOption] = useState('');

    useEffect(() => {
        fetchParts();
    }, []);

    const fetchParts = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/pretest/parts');
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            
            if (Array.isArray(data) && data.length > 0) {
                setParts(data);
                fetchQuestion(data[0].id, 3);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching parts:", error);
            setLoading(false);
        }
    };

    const fetchQuestion = async (partId, difficultyLevel) => {
        setLoading(true);
        setSelectedOption('');
        try {
            const res = await fetch(`http://localhost:5000/api/pretest/question/${partId}/${difficultyLevel}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            
            setQuestion(data);
        } catch (error) {
            console.error("Error fetching question:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAnswer = async () => {
        if (!selectedOption || !question) return;
        const isCorrect = selectedOption === question.correct_answer;
        const currentPart = parts[currentPartIndex];

        if (step === 1) {
            setIsStep1Correct(isCorrect);
            setStep(2);
            fetchQuestion(currentPart.id, isCorrect ? 4 : 2);
        } else {
            let finalLevel = 1;
            if (isStep1Correct && isCorrect) finalLevel = 4;
            else if (isStep1Correct && !isCorrect) finalLevel = 3;
            else if (!isStep1Correct && isCorrect) finalLevel = 2;

            const newResults = [...results, { partId: currentPart.id, level: finalLevel }];
            setResults(newResults);

            if (currentPartIndex + 1 < parts.length) {
                const nextPartIndex = currentPartIndex + 1;
                setCurrentPartIndex(nextPartIndex);
                setStep(1);
                setIsStep1Correct(null);
                fetchQuestion(parts[nextPartIndex].id, 3);
            } else {
                submitResults(newResults, false);
            }
        }
    };

    const submitResults = async (finalResults, isSkip = false) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('http://localhost:5000/api/pretest/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, results: finalResults })
            });

            if (!res.ok) throw new Error('Network response was not ok');
            
            setTimeout(() => {
                setIsSubmitting(false);
                if (isSkip) {
                    if (onComplete) onComplete();
                } else {
                    setResults(finalResults); 
                    setViewState('summary');  
                }
            }, 800);
            
        } catch (error) {
            console.error("Error submitting results:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกผลการประเมินครับ");
            setIsSubmitting(false);
            if (onComplete) onComplete();
        }
    };

    const handleSkip = () => {
        if (window.confirm("คุณต้องการข้ามไปก่อนใช่หรือไม่?\n(ระบบจะตั้งค่าเริ่มต้นเป็น Level 1 และคุณสามารถกดกลับมาทำแบบประเมินใหม่ได้ที่หน้าหลักเสมอครับ)")) {
            if (parts.length > 0) {
                submitResults(parts.map(p => ({ partId: p.id, level: 1 })), true);
            } else {
                if (onComplete) onComplete();
            }
        }
    };

    const handleExitDuringExam = () => {
        if (window.confirm("คุณต้องการพักการทำแบบประเมินไว้ก่อนใช่หรือไม่?\n(คุณสามารถกดเริ่มประเมินใหม่ได้ทุกเมื่อที่แบนเนอร์สีทองบนหน้า Dashboard ครับ)")) {
            if (onComplete) onComplete(); 
        }
    };

    const getLevelText = (level) => {
        switch(level) {
            case 1: return { text: 'พื้นฐาน (Level 1)', className: 'level-1' };
            case 2: return { text: 'ปานกลาง (Level 2)', className: 'level-2' };
            case 3: return { text: 'ดี (Level 3)', className: 'level-3' };
            case 4: return { text: 'ดีเยี่ยม (Level 4)', className: 'level-4' };
            default: return { text: 'ยังไม่ประเมิน', className: '' };
        }
    };

    const totalQuestions = parts.length * 2;
    const answeredQuestions = (currentPartIndex * 2) + (step - 1);
    const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    const choiceMap = { 'A': 'ก.', 'B': 'ข.', 'C': 'ค.', 'D': 'ง.' };

    return (
        <div style={{ fontFamily: '"Kanit", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
                .fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .slide-up { animation: slideUp 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s ease; padding: 20px; }
                .modal-box { background: white; padding: 40px 35px; border-radius: 12px; max-width: 550px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); animation: slideUp 0.3s ease; border-top: 6px solid #1A365D; position: relative; max-height: 90vh; overflow-y: auto; }
                
                .option-card { transition: all 0.2s ease; border: 1px solid #D1D5DB; border-radius: 8px; cursor: pointer; background: #FFFFFF; display: flex; align-items: flex-start; padding: 16px 20px; text-align: left; }
                .option-card:hover { border-color: #A0AEC0; background: #F8FAFC; }
                .option-card.selected { border-color: #1A365D; background: #EBF4FF; box-shadow: 0 0 0 1px #1A365D; }

                .btn-close { position: absolute; top: 15px; right: 15px; width: 32px; height: 32px; border-radius: 50%; border: none; background: #F1F5F9; color: #64748B; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .btn-close:hover { background: #E2E8F0; color: #1E293B; }

                .result-table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 25px; text-align: left; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
                .result-table th { background: #F8FAFC; color: #1E293B; padding: 14px 16px; font-weight: 600; font-size: 15px; border-bottom: 2px solid #E2E8F0; }
                .result-table td { padding: 12px 16px; border-bottom: 1px solid #F1F5F9; color: #334155; font-size: 14px; vertical-align: middle; }
                .result-table tr:last-child td { border-bottom: none; }
                .level-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; text-align: center; width: 120px; }
                .level-1 { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }
                .level-2 { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
                .level-3 { background: #E0E7FF; color: #4338CA; border: 1px solid #C7D2FE; }
                .level-4 { background: #D1FAE5; color: #047857; border: 1px solid #A7F3D0; }

                @media (max-width: 768px) {
                    .modal-box { padding: 25px 20px; margin: 10px; width: 100%; max-height: 85vh; }
                    .modal-box h2 { font-size: 20px !important; }
                    .result-table th, .result-table td { padding: 10px 8px; font-size: 13px; }
                    .level-badge { width: 100px; padding: 4px 8px; font-size: 12px; }
                }
            `}</style>

            {viewState === 'intro' && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button onClick={handleSkip} className="btn-close" title="ข้ามไปก่อน">✕</button>
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <h2 style={{ color: '#1A365D', fontSize: '24px', margin: '0 0 12px 0', fontWeight: '600' }}>
                             ประเมินความรู้ก่อนเริ่มใช้งาน (Pre-test)
                        </h2>
                        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 25px 0' }}>
                            ระบบจะสุ่มข้อสอบสั้น ๆ เพื่อวิเคราะห์จุดแข็ง-จุดอ่อนของคุณในแต่ละพาร์ทวิชา และนำผลลัพธ์ไปสร้าง <strong style={{ color: '#10B981' }}>ตาราง Planner</strong> ให้เหมาะกับคุณโดยเฉพาะ
                        </p>
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '4px solid #D69E2E', borderRadius: '8px', padding: '18px 20px', marginBottom: '30px', textAlign: 'left', fontSize: '14px', color: '#334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>จำนวนข้อสอบทั้งหมด:</span>
                                <strong style={{ color: '#1E293B' }}>{totalQuestions > 0 ? `${totalQuestions} ข้อ` : 'กำลังคำนวณ...'} (วิชาละ 2 ข้อ)</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>รูปแบบการประเมิน:</span>
                                <strong style={{ color: '#1A365D' }}>Adaptive (ปรับความยากอัตโนมัติ)</strong>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => setViewState('exam')}
                                disabled={!parts.length}
                                style={{ padding: '14px', background: parts.length ? '#1A365D' : '#CBD5E1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '500', cursor: parts.length ? 'pointer' : 'not-allowed', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.18)', transition: 'background 0.2s' }}
                            >
                                เริ่มทำแบบทดสอบตอนนี้
                            </button>
                            <button
                                onClick={handleSkip}
                                style={{ padding: '10px', background: 'transparent', color: '#64748B', border: 'none', fontSize: '14px', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                ข้ามไปก่อน (กลับมาทำภายหลังได้ทุกเมื่อ)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewState === 'exam' && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: '750px', textAlign: 'left', padding: '35px' }}>
                        {!isSubmitting && <button onClick={handleExitDuringExam} className="btn-close" title="พักการประเมินชั่วคราว">✕</button>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4B5563', marginBottom: '8px', fontWeight: '500', paddingRight: '25px' }}>
                            <span>ประเมินระดับ :: <strong style={{ color: '#1A365D' }}>{parts[currentPartIndex]?.part_name}</strong></span>
                            <span>ข้อที่ {isSubmitting ? totalQuestions : answeredQuestions + 1} / {totalQuestions}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden', marginBottom: '25px' }}>
                            <div style={{ width: `${isSubmitting ? 100 : progressPercent}%`, height: '100%', background: '#D69E2E', transition: 'width 0.3s ease' }}></div>
                        </div>

                        {isSubmitting ? (
                            <div className="fade-in" style={{ textAlign: 'center', padding: '60px 0', color: '#1A365D' }}>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '600' }}>ระบบกำลังประมวลผลคะแนน...</h3>
                                <p style={{ color: '#64748B', fontSize: '15px' }}>กำลังบันทึกผลเพื่อจัดทำรายงานประเมินศักยภาพเบื้องต้น</p>
                            </div>
                        ) : loading || !question ? (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748B' }}>กำลังโหลดโจทย์ข้อถัดไป...</div>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 25px 0', color: '#1F2937', fontSize: '18px', lineHeight: '1.6', fontWeight: '500' }}>
                                    {question.question_text}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
                                    {['A', 'B', 'C', 'D'].map((opt) => {
                                        const isSelected = selectedOption === opt;
                                        return (
                                            <div
                                                key={opt}
                                                onClick={() => setSelectedOption(opt)}
                                                className={`option-card ${isSelected ? 'selected' : ''}`}
                                            >
                                                <span style={{ fontWeight: '600', marginRight: '12px', color: isSelected ? '#1A365D' : '#4B5563' }}>
                                                    {choiceMap[opt]}
                                                </span>
                                                <span style={{ color: '#374151', fontSize: '15px', lineHeight: '1.5' }}>
                                                    {question[`option_${opt.toLowerCase()}`]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={handleConfirmAnswer}
                                    disabled={!selectedOption}
                                    style={{ width: '100%', padding: '14px', background: selectedOption ? '#1A365D' : '#E2E8F0', color: selectedOption ? 'white' : '#94A3B8', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', cursor: selectedOption ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                                >
                                    ยืนยันคำตอบ และไปข้อถัดไป
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {viewState === 'summary' && (
                <div className="modal-overlay">
                    <div className="modal-box slide-up" style={{ maxWidth: '600px', textAlign: 'left', padding: '35px 40px' }}>
                        
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F0FDF4', color: '#10B981', width: '56px', height: '56px', borderRadius: '50%', marginBottom: '16px' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 style={{ color: '#1A365D', fontSize: '22px', margin: '0 0 8px 0', fontWeight: '600' }}>
                                รายงานผลการประเมินศักยภาพเบื้องต้น
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                                ระบบได้บันทึกระดับความสามารถของคุณเพื่อนำไปปรับแผนการเรียนในตาราง  Planner เรียบร้อยแล้ว
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="result-table">
                                <thead>
                                    <tr>
                                        <th>หมวดวิชา (Part)</th>
                                        <th style={{ textAlign: 'center', width: '150px' }}>ผลการประเมิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, idx) => {
                                        const partObj = parts.find(p => p.id === r.partId);
                                        const levelInfo = getLevelText(r.level);
                                        return (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: '500' }}>{partObj ? partObj.part_name : `วิชาที่ ${r.partId}`}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`level-badge ${levelInfo.className}`}>
                                                        {levelInfo.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={() => { if (onComplete) onComplete(); }}
                            style={{ width: '100%', padding: '14px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.15)', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.target.style.background = '#2A4365'}
                            onMouseOut={(e) => e.target.style.background = '#1A365D'}
                        >
                            เข้าสู่หน้าแดชบอร์ดหลัก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pretest;