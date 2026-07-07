import React, { useState, useEffect } from 'react';
import PracticeMode from './PracticeMode'; 
import MockExamMode from './MockExamMode'; 
import AdminAddQuestion from './AdminAddQuestion'; 
import DashboardCharts from './DashboardCharts'; 
import StudyPlanner from './StudyPlanner'; 
import AuthPage from './AuthPage';
import Pretest from './Pretest';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentMode, setCurrentMode] = useState(() => {
      return localStorage.getItem('currentMode') || null;
  });

  const [targetPracticeId, setTargetPracticeId] = useState(() => {
      const savedId = localStorage.getItem('targetPracticeId');
      return savedId ? parseInt(savedId, 10) : null;
  });

  const [hasCompletedPretest, setHasCompletedPretest] = useState(() => {
      if (!currentUser) return false;
      return localStorage.getItem(`pretest_completed_${currentUser.id}`) === 'true';
  });

  useEffect(() => {
      if (currentUser) {
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          setHasCompletedPretest(localStorage.getItem(`pretest_completed_${currentUser.id}`) === 'true');
      } else {
          localStorage.removeItem('currentUser');
      }
  }, [currentUser]);

  useEffect(() => {
      if (currentMode) localStorage.setItem('currentMode', currentMode);
      else localStorage.removeItem('currentMode');
  }, [currentMode]);

  useEffect(() => {
      if (targetPracticeId !== null) localStorage.setItem('targetPracticeId', targetPracticeId);
      else localStorage.removeItem('targetPracticeId');
  }, [targetPracticeId]);

  if (!currentUser) {
      return <AuthPage onLoginSuccess={(userData) => setCurrentUser(userData)} />;
  }

  const userId = currentUser.id;
  const userRole = currentUser.role || 'user';
  const isAdmin = userRole === 'admin';

  if (currentMode === 'admin' && !isAdmin) {
      alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบเท่านั้นครับ');
      setCurrentMode(null);
  }

  const handleLogout = () => {
      const confirmLogout = window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?');
      if (confirmLogout) {
          setCurrentUser(null);
          setCurrentMode(null);
          setTargetPracticeId(null);
      }
  };

  const handleBackToMain = () => {
    localStorage.removeItem('practice_step');
    localStorage.removeItem('practice_category');
    localStorage.removeItem('practice_part');
    
    setTargetPracticeId(null);
    localStorage.removeItem('targetPracticeId');
    
    setCurrentMode(null);
  };

  const handlePretestComplete = () => {
      localStorage.setItem(`pretest_completed_${userId}`, 'true');
      setHasCompletedPretest(true);
      setCurrentMode(null);
  };

  const handleRetakePretest = () => {
      setHasCompletedPretest(false);
  };

  return (
    <div style={{ fontFamily: '"Kanit", sans-serif', backgroundColor: '#F3F4F6', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
        }

        .nav-header { 
            background: linear-gradient(90deg, #1A365D 0%, #2A4365 100%); 
            border-bottom: 3px solid #D69E2E;
            padding: 12px 40px; 
            color: white; 
            display: flex; justify-content: space-between; align-items: center; 
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
            position: sticky; top: 0; z-index: 50; 
        }
        
        .brand-container {
            display: flex; align-items: center; gap: 15px; cursor: pointer;
            transition: transform 0.2s ease;
        }
        .brand-container:hover { transform: scale(1.02); }
        
        .brand-icon-box {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
        }

        .menu-card { background: #FFFFFF; padding: 40px 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); cursor: pointer; width: 100%; max-width: 300px; transition: all 0.3s ease; border-top: 4px solid transparent; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .menu-card:hover { transform: translateY(-8px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        
        .card-practice:hover { border-top-color: #3182CE; }
        .card-mock:hover { border-top-color: #D69E2E; }
        .card-planner:hover { border-top-color: #10B981; } 
        
        .card-admin { background: #F8FAFC; border: 1px dashed #CBD5E1; border-top: none; }
        .card-admin:hover { border-color: #94A3B8; background: #F1F5F9; border-top: none; transform: translateY(-4px); }

        .btn-back { 
            background: rgba(255,255,255,0.05); 
            color: white; 
            border: 1px solid rgba(255,255,255,0.2); 
            padding: 8px 18px; 
            border-radius: 8px; 
            cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.2s ease; 
            display: flex; align-items: center; gap: 8px;
        }
        .btn-back:hover { 
            background: rgba(255,255,255,0.15); 
            border-color: #D69E2E; 
            color: #D69E2E; 
        }

        .btn-logout {
            background: transparent;
            color: #E2E8F0;
            border: 1px solid transparent;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer; font-size: 14px; transition: all 0.2s;
        }
        .btn-logout:hover {
            color: #EF4444;
            background: rgba(239, 68, 68, 0.1);
        }

        .banner-box { background: #FFFBEB; border: 1px solid #FEF08A; border-left: 5px solid #D69E2E; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); }

        @media (max-width: 768px) {
            .nav-header { flex-direction: column; gap: 15px; padding: 15px 20px; }
            .nav-header > div { width: 100%; justify-content: space-between; }
            .brand-container h2 { font-size: 18px !important; }
            .brand-container span { display: none; }
            .menu-card { max-width: 100%; }
            .banner-box { flex-direction: column; text-align: center; }
            .banner-box button { width: 100%; }
            .page-title { font-size: 24px !important; }
        }
      `}</style>

      <div className="nav-header">
        <div className="brand-container" onClick={handleBackToMain}>
          <div className="brand-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ระบบสอบ ก.พ. ภาค ก
            <span style={{ fontSize: '15px', fontWeight: '400', color: '#D69E2E', borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
              แพลตฟอร์มอัจฉริยะ
            </span>
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {!currentMode && (
                <span style={{ fontSize: '14px', color: '#CBD5E1' }}>
                    ยินดีต้อนรับ, <strong>{currentUser.name}</strong>
                    {isAdmin && (
                        <span style={{ background: '#D69E2E', color: '#1A365D', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px' }}>
                            ADMIN
                        </span>
                    )}
                </span>
            )}

            {currentMode ? (
               <button className="btn-back" onClick={handleBackToMain}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                 กลับหน้าเมนูหลัก
               </button>
            ) : (
               <button className="btn-logout" onClick={handleLogout}>ออกจากระบบ</button>
            )}
        </div>
      </div>

      {!currentMode && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '40px', paddingBottom: '60px', paddingLeft: '15px', paddingRight: '15px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 className="page-title" style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '600' }}>
                {isAdmin ? 'ส่วนจัดการระบบ (Admin Panel)' : 'เลือกโหมดการใช้งาน'}
            </h1>
            <p style={{ color: '#6B7280', fontSize: '16px', margin: 0 }}>
                {isAdmin ? 'จัดการฐานข้อมูลข้อสอบและระบบการทดสอบ' : 'พัฒนาศักยภาพของคุณด้วยระบบทดสอบที่ได้มาตรฐาน'}
            </p>
          </div>

          {isAdmin ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <div className="menu-card card-admin" onClick={() => setCurrentMode('admin')}>
                  <div style={{ background: '#E2E8F0', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  </div>
                  <h2 style={{ color: '#475569', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>จัดการข้อสอบ (Admin)</h2>
                  <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>เพิ่มและแก้ไขข้อสอบ อัปโหลดรูปภาพโจทย์และตัวเลือกเข้าสู่ฐานข้อมูล</p>
                </div>
            </div>
          ) : (
            <>
                <div style={{ maxWidth: '1000px', margin: '0 auto 35px auto', width: '100%' }}>
                    <div className="banner-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#FEF08A', borderRadius: '50%', padding: '8px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h4 style={{ margin: '0 0 3px 0', color: '#92400E', fontSize: '15px', fontWeight: '600' }}>ต้องการให้ AI ปรับตารางอ่านหนังสือให้แม่นยำขึ้นหรือไม่</h4>
                                <p style={{ margin: 0, color: '#B45309', fontSize: '13px' }}>หากคุณเคยกดข้าม หรืออยากอัปเดตระดับความสามารถปัจจุบัน สามารถทำแบบทดสอบได้ทุกเมื่อ</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleRetakePretest}
                            style={{ background: '#1A365D', color: '#FFFFFF', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
                            onMouseOver={(e) => e.target.style.background = '#2A4365'}
                            onMouseOut={(e) => e.target.style.background = '#1A365D'}
                        >
                            ทำแบบประเมิน Pre-test
                        </button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto 60px auto' }}>
                  <div className="menu-card card-practice" onClick={() => hasCompletedPretest && setCurrentMode('practice')}>
                    <div style={{ background: '#EBF8FF', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3182CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>โหมดฝึกทำ (Practice)</h2>
                    <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>เลือกลุยทีละพาร์ท ระบบปรับความยากง่ายอัตโนมัติตามความสามารถ</p>
                  </div>

                  <div className="menu-card card-mock" onClick={() => hasCompletedPretest && setCurrentMode('mock')}>
                    <div style={{ background: '#FEFCBF', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>จำลองสอบจริง (Mock Exam)</h2>
                    <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>ทำข้อสอบชุดใหญ่ 100 ข้อ จับเวลา 3 ชั่วโมง เหมือนลงสนามสอบจริง</p>
                  </div>

                  <div className="menu-card card-planner" onClick={() => hasCompletedPretest && setCurrentMode('planner')}>
                    <div style={{ background: '#F0FDF4', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>ตารางอัจฉริยะ (Planner)</h2>
                    <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>วิเคราะห์จุดอ่อนและจัดตารางติวให้อัตโนมัติ พร้อมนับถอยหลังสู่วันสอบ</p>
                  </div>
                </div>

                <DashboardCharts key={hasCompletedPretest ? 'updated' : 'initial'} userId={userId} />
            </>
          )}
        </div>
      )}

      {currentMode && (
        <div style={{ flex: 1 }}>
          {currentMode === 'practice' && (
              <PracticeMode 
                  userId={userId} 
                  targetPartId={targetPracticeId} 
                  onBackToPlanner={() => {
                      setTargetPracticeId(null); 
                      setCurrentMode('planner'); 
                  }}
              />
          )}
          {currentMode === 'mock' && <MockExamMode userId={userId} />}  
          {currentMode === 'planner' && (
             <StudyPlanner 
                userId={userId}
                onStartPractice={(partId, category) => {
                   if (category === 'Mock Exam') {
                       setCurrentMode('mock');
                   } else {
                       setTargetPracticeId(partId); 
                       setCurrentMode('practice');
                   }
                }} 
             />
          )}
          {currentMode === 'admin' && isAdmin && <AdminAddQuestion />}
        </div>
      )}

      {!hasCompletedPretest && !isAdmin && (
          <Pretest 
             userId={userId} 
             onComplete={handlePretestComplete} 
          />
      )}

    </div>
  );
}

export default App;