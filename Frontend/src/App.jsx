import React, { useState, useEffect } from 'react';
import PracticeMode from './PracticeMode'; 
import MockExamMode from './MockExamMode'; 
import AdminAddQuestion from './AdminAddQuestion'; 
import DashboardCharts from './DashboardCharts'; 
import StudyPlanner from './StudyPlanner'; 
import AuthPage from './AuthPage';

function App() {
  // 1. ดึงข้อมูลจาก localStorage มาตั้งเป็นค่าเริ่มต้น
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

  // 2. สร้าง useEffect เพื่อเซฟข้อมูลลงเครื่องอัตโนมัติ ทุกครั้งที่มีการเปลี่ยน State
  useEffect(() => {
      if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
      else localStorage.removeItem('currentUser');
  }, [currentUser]);

  useEffect(() => {
      if (currentMode) localStorage.setItem('currentMode', currentMode);
      else localStorage.removeItem('currentMode');
  }, [currentMode]);

  useEffect(() => {
      if (targetPracticeId !== null) localStorage.setItem('targetPracticeId', targetPracticeId);
      else localStorage.removeItem('targetPracticeId');
  }, [targetPracticeId]);

  //  ถ้ายังไม่ล็อกอิน ให้แสดงหน้า AuthPage
  if (!currentUser) {
      return <AuthPage onLoginSuccess={(userData) => setCurrentUser(userData)} />;
  }

  // ดึง userId และ role ออกมาจากข้อมูลคนที่ล็อกอิน
  const userId = currentUser.id;
  const userRole = currentUser.role || 'user'; // ถ้าไม่มีค่า ให้มองเป็น 'user' ทั่วไปไว้ก่อน

  //  [Route Guard] ดักจับความปลอดภัย: ถ้าพยายามเข้าหน้า admin แต่ยศไม่ใช่ admin ให้ดีดออกทันที
  if (currentMode === 'admin' && userRole !== 'admin') {
      alert(' คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบเท่านั้นครับ');
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
    // ล้างค่าโหมดฝึกทำเมื่อกดกลับ (แต่ยังคง session ที่ค้างไว้ใน localStorage ตามที่เราทำกันไว้ก่อนหน้านี้)
    localStorage.removeItem('practice_step');
    localStorage.removeItem('practice_category');
    localStorage.removeItem('practice_part');
    
    // สั่งล้างค่าทางลัดตาราง Planner ทั้งหมด ป้องกันการข้ามหน้าจอโดยไม่ตั้งใจ
    setTargetPracticeId(null);
    localStorage.removeItem('targetPracticeId');
    
    setCurrentMode(null);
  };

  return (
    <div style={{ fontFamily: '"Kanit", sans-serif', backgroundColor: '#F3F4F6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

        .menu-card { background: #FFFFFF; padding: 40px 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); cursor: pointer; width: 300px; transition: all 0.3s ease; border-top: 4px solid transparent; display: flex; flex-direction: column; align-items: center; text-align: center; }
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
      `}</style>

      {/* แถบเมนูด้านบน */}
      <div className="nav-header">
        <div className="brand-container" onClick={() => setCurrentMode(null)}>
          <div className="brand-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ระบบสอบ ก.พ.
            <span style={{ fontSize: '15px', fontWeight: '400', color: '#D69E2E', borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
              แพลตฟอร์มอัจฉริยะ
            </span>
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* แสดงชื่อและยศของคนล็อกอิน */}
            {!currentMode && (
                <span style={{ fontSize: '14px', color: '#CBD5E1' }}>
                    ยินดีต้อนรับ, <strong>{currentUser.name}</strong>
                    {userRole === 'admin' && (
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

      {/* หน้าเลือกโหมด (แสดงตอน currentMode เป็น null) */}
      {!currentMode && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '50px', paddingBottom: '60px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '600' }}>เลือกโหมดการใช้งาน</h1>
            <p style={{ color: '#6B7280', fontSize: '16px', margin: 0 }}>พัฒนาศักยภาพของคุณด้วยระบบทดสอบที่ได้มาตรฐาน</p>
          </div>
          
          {/* กล่องเมนู */}
          <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto 60px auto' }}>
            
            {/* กล่องโหมดฝึกทำ */}
            <div className="menu-card card-practice" onClick={() => setCurrentMode('practice')}>
              <div style={{ background: '#EBF8FF', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3182CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>โหมดฝึกทำ (Practice)</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>เลือกลุยทีละพาร์ท ระบบปรับความยากง่ายอัตโนมัติตามความสามารถ</p>
            </div>

            {/* กล่องโหมดสอบจริง */}
            <div className="menu-card card-mock" onClick={() => setCurrentMode('mock')}>
              <div style={{ background: '#FEFCBF', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>จำลองสอบจริง (Mock Exam)</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>ทำข้อสอบชุดใหญ่ 100 ข้อ จับเวลา 3 ชั่วโมง เหมือนลงสนามสอบจริง</p>
            </div>

            {/* กล่องเมนู Planner */}
            <div className="menu-card card-planner" onClick={() => setCurrentMode('planner')}>
              <div style={{ background: '#F0FDF4', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>ตารางอัจฉริยะ (Planner)</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>วิเคราะห์จุดอ่อนและจัดตารางติวให้อัตโนมัติ พร้อมนับถอยหลังสู่วันสอบ</p>
            </div>

            {/*  [เงื่อนไข] แสดงกล่องจัดการข้อสอบ (Admin) ก็ต่อเมื่อเป็นยศ 'admin' เท่านั้น */}
            {userRole === 'admin' && (
                <div className="menu-card card-admin" onClick={() => setCurrentMode('admin')}>
                  <div style={{ background: '#E2E8F0', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  </div>
                  <h2 style={{ color: '#475569', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>จัดการข้อสอบ (Admin)</h2>
                  <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>เพิ่มและแก้ไขข้อสอบ อัปโหลดรูปภาพโจทย์และตัวเลือกเข้าสู่ฐานข้อมูล</p>
                </div>
            )}

          </div>

          <DashboardCharts userId={userId} />

        </div>
      )}

      {/* เรียกใช้งาน Component ตามที่เลือก */}
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
                onStartPractice={(partId) => {
                   setTargetPracticeId(partId); 
                   setCurrentMode('practice');
                }} 
             />
          )}
          
          {/*  [Route Render] อนุญาตให้เรนเดอร์หน้า Admin ก็ต่อเมื่อยศเป็น admin */}
          {currentMode === 'admin' && userRole === 'admin' && <AdminAddQuestion />}
        </div>
      )}

    </div>
  );
}

export default App;