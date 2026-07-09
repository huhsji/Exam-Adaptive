import React, { useState, useEffect } from 'react';

export default function StudyPlanner({ userId, onStartPractice }) {
    const [plannerData, setPlannerData] = useState({ target_exam_date: null, planners: [], progress: [] });
    const [inputDate, setInputDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalFeedback, setModalFeedback] = useState(null);

    const fetchPlanner = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/planner?user_id=${userId}`);
            const data = await res.json();

            if(res.ok) {
                setPlannerData(data);
            }
        } catch (error) {
            console.error("Error fetching planner:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPlanner();
    }, [userId]);

    const handlePreCheckGenerate = () => {
        if (!inputDate && !plannerData.target_exam_date) {
            setModalFeedback({
                type: 'warning',
                title: 'กรุณาระบุวันสอบเป้าหมาย',
                message: 'โปรดเลือกวันที่คุณคาดว่าจะเข้าสอบ ก.พ. ก่อนครับ เพื่อให้ระบบคำนวณระยะเวลาและวางแผนการติวได้อย่างแม่นยำ'
            });
            return;
        }
        setShowConfirmModal(true);
    };

    const executeGeneratePlan = async () => {
        setShowConfirmModal(false);
        setIsGenerating(true);
        
        const target = inputDate || plannerData.target_exam_date; 
        
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/planner/generate`, {
                method: 'POST',
                headers: {'Content-Type' : 'application/json'},
                body: JSON.stringify({ user_id: userId, target_date: target })
            });
            const data = await res.json();

            if (res.ok) {
                setModalFeedback({
                    type: 'success',
                    title: 'จัดตารางติวเข้มสำเร็จ',
                    message: `${data.message} (ระบบได้วิเคราะห์จุดอ่อนล่าสุดและจัดตารางให้คุณทั้งหมด ${data.days_planned} วันเรียบร้อยแล้ว)`
                });
                fetchPlanner();
            } else {
                setModalFeedback({
                    type: 'error',
                    title: 'ไม่สามารถสร้างตารางได้',
                    message: data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์'
                });
            }
        } catch (error) {
            console.error("Error generating plan:", error);
            setModalFeedback({
                type: 'error',
                title: 'ข้อผิดพลาดระบบ',
                message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ'
            });
        }
        setIsGenerating(false);
    };

    const calculateDaysLeft = () => {
        if (!plannerData.target_exam_date) return null;
        const target = new Date(plannerData.target_exam_date);
        const today = new Date();
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const groupedPlans = plannerData.planners.reduce((acc, plan) => {
        if (!acc[plan.scheduled_date]) acc[plan.scheduled_date] = [];
        acc[plan.scheduled_date].push(plan);
        return acc;
    }, {});

    const daysLeft = calculateDaysLeft();

    const todayForNudge = new Date();
    todayForNudge.setHours(0,0,0,0);
    const hasFuturePassed = plannerData.planners.some(p => {
        const pDate = new Date(p.scheduled_date);
        return pDate > todayForNudge && p.current_level >= 3 && p.category !== 'Mock Exam';
    });

    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: '"Kanit", sans-serif', position: 'relative' }}>
            
            <style>{`
                .task-card { transition: all 0.2s ease; border: 1px solid #E2E8F0; background: #FFFFFF; }
                .task-card:hover { border-color: #3B82F6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); transform: translateY(-2px); cursor: pointer; }
                .btn-start { background: #EBF4FF; color: #1A365D; border: 1px solid #BFDBFE; padding: 6px 14px; border-radius: 6px; font-weight: 500; font-size: 13px; transition: all 0.2s; white-space: nowrap; }
                .task-card:hover .btn-start { background: #1A365D; color: #FFFFFF; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s ease; }
                .modal-box { background: white; padding: 36px 32px; border-radius: 12px; max-width: 440px; width: 95%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25); animation: slideUp 0.3s ease; position: relative; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

                .task-card-inner { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }

                @media (max-width: 768px) {
                    .modal-box { padding: 25px 20px; }
                    .task-card-inner { flex-direction: column; align-items: flex-start; gap: 10px; }
                    .btn-start { width: 100%; text-align: center; }
                    .banner-nudge { flex-direction: column; text-align: center; }
                    .banner-nudge button { width: 100%; }
                }
            `}</style>

            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ borderTop: '6px solid #1A365D' }}>
                        <button onClick={() => setShowConfirmModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', color: '#94A3B8', cursor: 'pointer', fontWeight: '300' }}>&times;</button>
                        
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        
                        <h3 style={{ margin: '0 0 12px 0', color: '#1A365D', fontSize: '22px', fontWeight: '600' }}>ยืนยันการจัดตารางติวใหม่</h3>
                        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 28px 0' }}>
                            ระบบจะทำการวิเคราะห์ความแม่นยำและจุดอ่อนล่าสุดของคุณ เพื่อสร้างตารางอ่านหนังสือและแบบฝึกหัดชุดใหม่ คุณต้องการดำเนินการต่อหรือไม่ครับ?
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={executeGeneratePlan} style={{ padding: '13px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.18)', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                ยืนยันสร้างตารางเรียนใหม่
                            </button>
                            <button onClick={() => setShowConfirmModal(false)} style={{ padding: '12px', background: 'white', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalFeedback && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ borderTop: `6px solid ${modalFeedback.type === 'success' ? '#10B981' : (modalFeedback.type === 'warning' ? '#F59E0B' : '#EF4444')}` }}>
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                            {modalFeedback.type === 'success' ? (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={modalFeedback.type === 'warning' ? '#F59E0B' : '#EF4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            )}
                        </div>

                        <h3 style={{ margin: '0 0 10px 0', color: '#1A365D', fontSize: '22px', fontWeight: '600' }}>{modalFeedback.title}</h3>
                        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px 0' }}>{modalFeedback.message}</p>
                        
                        <button onClick={() => setModalFeedback(null)} style={{ width: '100%', padding: '13px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                            รับทราบและดำเนินการต่อ
                        </button>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>แผนการเตรียมสอบ (Planner)</h2>
                <p style={{ color: '#6B7280', fontSize: '16px', margin: 0 }}>ทำข้อสอบตามแผนที่ระบบจัดให้ เพื่อดันคะแนนจุดอ่อนให้ผ่านเกณฑ์</p>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '50px 0' }}>กำลังโหลดข้อมูลตาราง...</div>
            ) : (
                <>
                    {plannerData.target_exam_date && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                            <div style={{ background: '#FFFFFF', padding: '40px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
                                <div style={{ fontSize: '15px', color: '#64748B', fontWeight: '500' }}>นับถอยหลังสู่วันสอบ ก.พ.</div>
                                <div style={{ fontSize: '72px', color: daysLeft <= 7 ? '#EF4444' : '#1A365D', fontWeight: '600', lineHeight: '1.2' }}>
                                    {daysLeft} <span style={{fontSize: '22px', color: '#94A3B8'}}>วัน</span>
                                </div>
                                <div style={{ fontSize: '15px', color: '#475569', marginBottom: '25px' }}>
                                    เป้าหมาย: {new Date(plannerData.target_exam_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} style={{ padding: '10px 15px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', width: '100%', maxWidth: '200px' }} />
                                    <button onClick={handlePreCheckGenerate} disabled={isGenerating} style={{ padding: '10px 25px', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', width: '100%', maxWidth: '200px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#2A4365'} onMouseOut={(e) => e.target.style.background = '#1A365D'}>
                                        Re-plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasFuturePassed && (
                        <div className="banner-nudge fade-in" style={{ background: '#FFFBEB', border: '1px solid #FEF08A', borderLeft: '5px solid #F59E0B', borderRadius: '8px', padding: '16px 20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', color: '#B45309', fontSize: '15px', fontWeight: '600' }}>คุณสอบผ่านบางวิชาในตารางอนาคตแล้ว</h4>
                                <p style={{ margin: 0, color: '#92400E', fontSize: '13px' }}>กด Re-plan เพื่อเอาวิชานี้ออกจากตาราง และดึงจุดอ่อนอื่นๆ ขึ้นมาทบทวนแทนดีไหมครับ?</p>
                            </div>
                            <button onClick={handlePreCheckGenerate} style={{ background: '#F59E0B', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                Re-plan ทันที
                            </button>
                        </div>
                    )}

                    {!plannerData.target_exam_date && (
                        <div style={{ background: '#FFFFFF', padding: '40px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center', marginBottom: '40px' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" style={{ marginBottom: '15px', display: 'inline-block' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <h3 style={{ color: '#1E293B', fontSize: '20px', margin: '0 0 10px 0' }}>คุณยังไม่ได้จัดตารางอ่านหนังสือ</h3>
                            <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '25px' }}>ระบุวันที่คุณคาดว่าจะเข้าสอบ ก.พ. เพื่อให้ระบบดึงจุดอ่อนของคุณมาจัดตารางให้อัตโนมัติ</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} style={{ padding: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', width: '100%', maxWidth: '200px' }} />
                                <button onClick={handlePreCheckGenerate} disabled={isGenerating} style={{ padding: '12px 25px', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', width: '100%', maxWidth: '200px' }}>สร้างตารางเรียน</button>
                            </div>
                        </div>
                    )}

                    {plannerData.planners.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h3 style={{ color: '#1E293B', fontSize: '18px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                แผนการเรียนของคุณ (Timeline)
                            </h3>

                            {Object.entries(groupedPlans).map(([date, plans]) => {
                                const planDate = new Date(date);
                                const todayDate = new Date();
                                todayDate.setHours(0,0,0,0);
                                const isPast = planDate < todayDate;
                                const isToday = planDate.getTime() === todayDate.getTime();

                                return (
                                    <div key={date}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                            <div style={{ background: isToday ? '#10B981' : (isPast ? '#94A3B8' : '#1A365D'), color: '#FFF', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                                {isToday ? 'ภารกิจวันนี้' : new Date(date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </div>
                                            <div style={{ flex: 1, height: '1px', background: '#E2E8F0', marginLeft: '15px' }}></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px' }}>
                                            {plans.map((p, idx) => {
                                                const isCompleted = p.is_completed === 1;
                                                const currentLevel = p.current_level || 0;
                                                const isPassed = currentLevel >= 3;
                                                
                                                let cardBg = '#FFFFFF';
                                                let borderColor = '#E2E8F0';
                                                let btnText = "เข้าทำข้อสอบ";
                                                let btnBg = '#EBF4FF';
                                                let btnColor = '#1A365D';
                                                let showMissedWarning = isPast && !isCompleted; 

                                                if (isCompleted) {
                                                    if (isPassed) {
                                                        cardBg = '#F0FDF4'; 
                                                        borderColor = '#10B981';
                                                        btnText = "สอบผ่านเกณฑ์";
                                                        btnBg = '#10B981';
                                                        btnColor = '#FFFFFF';
                                                    } else {
                                                        cardBg = '#F8FAFC'; 
                                                        borderColor = '#CBD5E1';
                                                        btnText = "ทำภารกิจเสร็จสิ้น";
                                                        btnBg = '#94A3B8';
                                                        btnColor = '#FFFFFF';
                                                    }
                                                } else if (p.category === 'Mock Exam') {
                                                    btnBg = '#FEFCBF';
                                                    btnColor = '#D69E2E';
                                                    btnText = "เริ่มจำลองสอบ";
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={!isCompleted ? "task-card" : ""}
                                                        onClick={() => {
                                                            if(onStartPractice) onStartPractice(p.part_id, p.category); 
                                                        }}
                                                        style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', position: 'relative', cursor: isCompleted ? 'default' : 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        {showMissedWarning && (
                                                            <div style={{ position: 'absolute', top: '-10px', left: '15px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px' }}>
                                                                ข้ามการฝึกฝน
                                                            </div>
                                                        )}
                                                        
                                                        <div className="task-card-inner">
                                                            <div>
                                                                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500', marginBottom: '4px' }}>{p.category}</div>
                                                                <div style={{ fontSize: '16px', color: '#1E293B', fontWeight: '600' }}>{p.part_name}</div>
                                                                {isCompleted && !isPassed && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>* แวะพักสมองก่อน แล้วค่อย Re-plan หรือกลับมาลุยใหม่วันอื่นนะ</div>}
                                                            </div>

                                                            <button className={!isCompleted ? "btn-start" : ""} style={{ background: btnBg, color: btnColor, border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '500', fontSize: '13px', cursor: isCompleted ? 'default' : 'pointer' }}>
                                                                {btnText}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}