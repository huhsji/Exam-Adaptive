import React, { useState, useEffect } from 'react';

export default function StudyPlanner({ userId, onStartPractice }) {
    const [plannerData, setPlannerData] = useState({ target_exam_date: null, planners: [], progress: [] });
    const [inputDate, setInputDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // State สำหรับควบคุมหน้าต่าง Popup ทางการ
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalFeedback, setModalFeedback] = useState(null); 

    const fetchPlanner = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/planner?user_id=${userId}`);
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

    // ตรวจสอบก่อนสร้างแผน เปิด Popup แทนการใช้ alert ดั้งเดิม
    const handlePreCheckGenerate = () => {
        if (!inputDate) {
            setModalFeedback({
                type: 'warning',
                title: 'กรุณาระบุวันสอบเป้าหมาย',
                message: 'โปรดเลือกวันที่คุณคาดว่าจะเข้าสอบ ก.พ. ก่อนครับ เพื่อให้ระบบ AI คำนวณระยะเวลาและวางแผนการติวได้อย่างแม่นยำ'
            });
            return;
        }
        setShowConfirmModal(true);
    };

    // ทำงานจริง ประมวลผลสร้างตารางเรียนใหม่
    const executeGeneratePlan = async () => {
        setShowConfirmModal(false);
        setIsGenerating(true);
        try {
            const res = await fetch(`http://localhost:5000/api/planner/generate`, {
                method: 'POST',
                headers: {'Content-Type' : 'application/json'},
                body: JSON.stringify({ user_id: userId, target_date: inputDate })
            });
            const data = await res.json();

            if (res.ok) {
                setModalFeedback({
                    type: 'success',
                    title: 'จัดตารางติวเข้มสำเร็จ!',
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

    const getCategoryConfig = (catName) => {
        if(catName.includes('อังกฤษ')) return { color: '#F59E0B', target: 50 };
        if(catName.includes('ข้าราชการ')) return { color: '#3B82F6', target: 60 };
        return { color: '#10B981', target: 60 };
    };

    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: '"Kanit", sans-serif', position: 'relative' }}>
            
            <style>{`
                .task-card { transition: all 0.2s ease; border: 1px solid #E2E8F0; background: #FFFFFF; }
                .task-card:hover { border-color: #3B82F6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); transform: translateY(-2px); cursor: pointer; }
                .btn-start { background: #EBF4FF; color: #1A365D; border: 1px solid #BFDBFE; padding: 6px 14px; border-radius: 6px; font-weight: 500; font-size: 13px; transition: all 0.2s; }
                .task-card:hover .btn-start { background: #1A365D; color: #FFFFFF; }

                /* สไตล์ Popup Modal ทางการ (Formal Navy Theme) */
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s ease; }
                .modal-box { background: white; padding: 36px 32px; border-radius: 12px; max-width: 440px; width: 90%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25); animation: slideUp 0.3s ease; position: relative; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* 1. POPUP ยืนยันการ Re-plan หรือจัดตารางใหม่ */}
            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ borderTop: '6px solid #1A365D' }}>
                        <button onClick={() => setShowConfirmModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', color: '#94A3B8', cursor: 'pointer', fontWeight: '300' }}>&times;</button>
                        
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        
                        <h3 style={{ margin: '0 0 12px 0', color: '#1A365D', fontSize: '22px', fontWeight: '600' }}>
                            ยืนยันการจัดตารางติวเข้มใหม่
                        </h3>
                        
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

            {/* 2. POPUP แจ้งเตือนผลลัพธ์ (Success / Warning / Error) */}
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

                        <h3 style={{ margin: '0 0 10px 0', color: '#1A365D', fontSize: '22px', fontWeight: '600' }}>
                            {modalFeedback.title}
                        </h3>
                        
                        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                            {modalFeedback.message}
                        </p>
                        
                        <button onClick={() => setModalFeedback(null)} style={{ width: '100%', padding: '13px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                            รับทราบและดำเนินการต่อ
                        </button>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>
                    ตารางติวเข้มอัจฉริยะ (Smart Planner)
                </h2>
                <p style={{ color: '#6B7280', fontSize: '16px', margin: 0 }}>ทำข้อสอบตามแผนที่ระบบจัดให้ เพื่อดันคะแนนจุดอ่อนให้ผ่านเกณฑ์</p>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '50px 0' }}>กำลังโหลดข้อมูลตาราง...</div>
            ) : (
                <>
                    {/* ส่วนที่ 1: สถานะภาพรวม (หลอด Progress และ นับถอยหลัง) */}
                    {plannerData.target_exam_date && (
                        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? '1fr 2fr' : '1fr', gap: '25px', marginBottom: '40px' }}>
                            
                            {/* กล่องนับถอยหลัง */}
                            <div style={{ background: '#FFFFFF', padding: '30px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>นับถอยหลังสู่วันสอบ ก.พ.</div>
                                <div style={{ fontSize: '64px', color: daysLeft <= 7 ? '#EF4444' : '#1A365D', fontWeight: '600', lineHeight: '1.2' }}>
                                    {daysLeft} <span style={{fontSize: '20px', color: '#94A3B8'}}>วัน</span>
                                </div>
                                <div style={{ fontSize: '14px', color: '#475569', marginBottom: '15px' }}>
                                    เป้าหมาย: {new Date(plannerData.target_exam_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} />
                                    <button onClick={handlePreCheckGenerate} disabled={isGenerating} style={{ padding: '8px 15px', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Re-plan</button>
                                </div>
                            </div>

                            {/* กล่องหลอดเปอร์เซ็นต์ (ความคืบหน้า) */}
                            <div style={{ background: '#FFFFFF', padding: '25px 30px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1E293B', display: 'flex', alignItems: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" style={{marginRight: '8px'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    ความพร้อมของคุณเทียบกับเกณฑ์ผ่าน
                                </h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    {plannerData.progress && plannerData.progress.map((prog, idx) => {
                                        const config = getCategoryConfig(prog.category);
                                        const isPassed = prog.percentage >= config.target;
                                        
                                        return (
                                            <div key={idx}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                                                    <span style={{ color: '#334155', fontWeight: '500' }}>{prog.category}</span>
                                                    <span style={{ color: isPassed ? '#10B981' : config.color, fontWeight: '600' }}>{prog.percentage}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${prog.percentage}%`, height: '100%', background: isPassed ? '#10B981' : config.color, borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                                                    เป้าหมายเกณฑ์ผ่าน: {config.target}% (สอบผ่านแล้ว {prog.passed}/{prog.total} พาร์ท)
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ส่วนที่ 2: ถ้ายังไม่มีเป้าหมาย */}
                    {!plannerData.target_exam_date && (
                        <div style={{ background: '#FFFFFF', padding: '40px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center', marginBottom: '40px' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" style={{ marginBottom: '15px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <h3 style={{ color: '#1E293B', fontSize: '20px', margin: '0 0 10px 0' }}>คุณยังไม่ได้จัดตารางอ่านหนังสือ</h3>
                            <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '25px' }}>ระบุวันที่คุณคาดว่าจะเข้าสอบ ก.พ. เพื่อให้ระบบดึงจุดอ่อนของคุณมาจัดตารางให้อัตโนมัติ</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} style={{ padding: '12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                                <button onClick={handlePreCheckGenerate} disabled={isGenerating} style={{ padding: '12px 25px', background: '#1A365D', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>สร้างตารางเรียน</button>
                            </div>
                        </div>
                    )}

                    {/* ส่วนที่ 3: แสดง Timeline ตารางเรียน */}
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
                                                {isToday ? ' ภารกิจวันนี้' : new Date(date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </div>
                                            <div style={{ flex: 1, height: '1px', background: '#E2E8F0', marginLeft: '15px' }}></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px' }}>
                                            {plans.map((p, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="task-card" 
                                                    onClick={() => {
                                                        if(onStartPractice) onStartPractice(p.part_id);
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '8px' }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500', marginBottom: '4px' }}>{p.category}</div>
                                                        <div style={{ fontSize: '16px', color: '#1E293B', fontWeight: '600' }}>{p.part_name}</div>
                                                    </div>

                                                    <button className="btn-start">
                                                        เข้าทำข้อสอบ ➔
                                                    </button>
                                                </div>
                                            ))}
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