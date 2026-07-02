import React, { useState } from 'react';

export default function AuthPage({ onLoginSuccess }) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    // 🟢 [แก้ไข 1] เพิ่ม education_level โดยตั้งค่าเริ่มต้นไว้ที่ 'ป.ตรี'
    const [formData, setFormData] = useState({ name: '', email: '', password: '', education_level: 'ป.ตรี' });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                if (isLoginMode) {
                    onLoginSuccess(data.user);
                } else {
                    alert('สมัครสมาชิกสำเร็จ! กรุณาล็อกอินเข้าสู่ระบบ');
                    setIsLoginMode(true);
                    // รีเซ็ตค่าหลังจากสมัครสำเร็จ
                    setFormData({ name: '', email: '', password: '', education_level: 'ป.ตรี' });
                }
            } else {
                alert(`⚠️ ${data.error}`);
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        }
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F3F4F6', fontFamily: '"Kanit", sans-serif' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ background: '#1A365D', width: '60px', height: '60px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                    </div>
                    <h2 style={{ margin: 0, color: '#1A365D', fontSize: '24px' }}>ระบบสอบ ก.พ. อัจฉริยะ</h2>
                    <p style={{ color: '#6B7280', marginTop: '5px' }}>{isLoginMode ? 'เข้าสู่ระบบเพื่อเรียนต่อ' : 'สร้างบัญชีใหม่เพื่อเริ่มต้น'}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {!isLoginMode && (
                        <>
                            <div>
                                <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '5px', display: 'block' }}>ชื่อ-นามสกุล</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '10px 15px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }} />
                            </div>
                            
                            {/* 🟢 [แก้ไข 2] เพิ่มช่อง Dropdown สำหรับเลือกระดับการศึกษา (แสดงเฉพาะตอนสมัคร) */}
                            <div>
                                <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '5px', display: 'block' }}>ระดับการศึกษา</label>
                                <select name="education_level" value={formData.education_level} onChange={handleChange} required style={{ width: '100%', padding: '10px 15px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#FFFFFF', cursor: 'pointer' }}>
                                    <option value="ปวช.">ระดับ ปวช.</option>
                                    <option value="ปวส.">ระดับ ปวส. / อนุปริญญา</option>
                                    <option value="ป.ตรี">ระดับ ปริญญาตรี</option>
                                    <option value="ป.โท">ระดับ ปริญญาโท</option>
                                </select>
                            </div>
                        </>
                    )}
                    <div>
                        <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '5px', display: 'block' }}>อีเมล</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '10px 15px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '5px', display: 'block' }}>รหัสผ่าน</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '10px 15px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }} />
                    </div>

                    <button type="submit" disabled={isLoading} style={{ marginTop: '10px', background: '#1A365D', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '500', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                        {isLoading ? 'กำลังประมวลผล...' : (isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6B7280' }}>
                    {isLoginMode ? 'ยังไม่มีบัญชีใช่ไหม? ' : 'มีบัญชีอยู่แล้ว? '}
                    <span onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: '#3182CE', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}>
                        {isLoginMode ? 'สมัครสมาชิกที่นี่' : 'ล็อกอินเข้าสู่ระบบ'}
                    </span>
                </div>
            </div>
        </div>
    );
}