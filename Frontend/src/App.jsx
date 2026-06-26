import React, { useState } from 'react';
import PracticeMode from './PracticeMode'; 
import MockExamMode from './MockExamMode'; 
import AdminAddQuestion from './AdminAddQuestion'; 

function App() {
  const [currentMode, setCurrentMode] = useState(null); // null = หน้าเมนูหลัก

  return (
    <div style={{ fontFamily: '"Kanit", sans-serif', backgroundColor: '#F3F4F6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        
        /* 🌟 ลบขอบขาวเริ่มต้นของ Browser ทิ้งให้กางเต็มจอ 100% 🌟 */
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
        }

        /* 🌟 อัปเกรด Navbar ให้ดูพรีเมียม */
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
        .card-admin { background: #F8FAFC; border: 1px dashed #CBD5E1; border-top: none; }
        .card-admin:hover { border-color: #94A3B8; background: #F1F5F9; border-top: none; transform: translateY(-4px); }

        /* 🌟 อัปเกรดปุ่มย้อนกลับ */
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
      `}</style>

      {/* 📍 แถบเมนูด้านบน (อัปเกรดใหม่) */}
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
        
        {currentMode && (
           <button className="btn-back" onClick={() => setCurrentMode(null)}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
             กลับหน้าเมนูหลัก
           </button>
        )}
      </div>

      {/* หน้าเลือกโหมด (แสดงตอน currentMode เป็น null) */}
      {!currentMode && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h1 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '600' }}>เลือกโหมดการใช้งาน</h1>
            <p style={{ color: '#6B7280', fontSize: '16px', margin: 0 }}>พัฒนาศักยภาพของคุณด้วยระบบทดสอบที่ได้มาตรฐาน</p>
          </div>
          
          <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1000px' }}>
            
            {/* กล่องโหมดฝึกทำ */}
            <div className="menu-card card-practice" onClick={() => setCurrentMode('practice')}>
              <div style={{ background: '#EBF8FF', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3182CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>โหมดฝึกทำ (Practice)</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>เลือกลุยทีละพาร์ท ระบบปรับความยากง่ายอัตโนมัติตามความสามารถ พร้อมเฉลยละเอียด</p>
            </div>

            {/* กล่องโหมดสอบจริง */}
            <div className="menu-card card-mock" onClick={() => setCurrentMode('mock')}>
              <div style={{ background: '#FEFCBF', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h2 style={{ color: '#1A365D', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>จำลองสอบจริง (Mock Exam)</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>ทำข้อสอบชุดใหญ่ 100 ข้อ จับเวลา 3 ชั่วโมง เหมือนลงสนามสอบจริง</p>
            </div>

            {/* กล่องจัดการข้อสอบ (Admin) */}
            <div className="menu-card card-admin" onClick={() => setCurrentMode('admin')}>
              <div style={{ background: '#E2E8F0', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <h2 style={{ color: '#475569', margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>จัดการข้อสอบ (Admin)</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>เพิ่มและแก้ไขข้อสอบ อัปโหลดรูปภาพโจทย์และตัวเลือกเข้าสู่ฐานข้อมูล</p>
            </div>

          </div>
        </div>
      )}

      {/* เรียกใช้งาน Component ตามที่เลือก */}
      {currentMode && (
        <div style={{ flex: 1 }}>
          {currentMode === 'practice' && <PracticeMode />}
          {currentMode === 'mock' && <MockExamMode />}
          {currentMode === 'admin' && <AdminAddQuestion />}
        </div>
      )}

    </div>
  );
}

export default App;