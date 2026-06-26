import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; 

function AdminAddQuestion() {
    const [partList, setPartList] = useState([]);

    const [formData, setFormData] = useState({
        part_id: '',
        difficulty_level: 1,
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
        exam_year: '',
        explanation: ''
    });

    const [images, setImages] = useState({
        question_image: null,
        option_a_image: null,
        option_b_image: null,
        option_c_image: null,
        option_d_image: null,
    });

    useEffect(() => {
        const fetchParts = async() => {
            try {
                const response = await axios.get('http://localhost:5000/api/admin/parts');
                setPartList(response.data);
            } catch (error) {
                console.error("Error fetching parts:", error);
            }
        }
        fetchParts();
    }, []);

    const handleTextChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setImages({ ...images, [e.target.name]: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const submitData = new FormData();

        Object.keys(formData).forEach(key => {
            submitData.append(key, formData[key]);
        });

        Object.keys(images).forEach(key => {
            if (images[key]) {
                submitData.append(key, images[key]);
            }
        });

        try {
            const response = await axios.post('http://localhost:5000/api/admin/questions', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert(response.data.message);

            setFormData({ ...formData, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', explanation: '' });
            setImages({ question_image: null, option_a_image: null, option_b_image: null, option_c_image: null, option_d_image: null });

            document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');

        } catch (error) {
            console.error("Error submitting form:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อสอบ กรุณาเช็ก Console");
        }
    };

    const [excelFile, setExcelFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleExcelChange = (e) => {
        setExcelFile(e.target.files[0]);
    };

    const handleExcelSubmit = async () => {
        if (!excelFile) {
            return alert("กรุณาเลือกไฟล์ Excel (.xlsx) ก่อนครับ");
        }
        
        setIsUploading(true);
        const excelData = new FormData();
        excelData.append('excel_file', excelFile);

        try {
            const response = await axios.post('http://localhost:5000/api/admin/upload-excel', excelData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(response.data.message);
            setExcelFile(null); 
        } catch (error) {
            console.error("Error uploading Excel:", error);
            alert("อัปโหลดไฟล์ Excel ไม่สำเร็จ");
        } finally {
            setIsUploading(false);
        }
    };

    // ================= UI RENDERING ================= //
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', padding: '40px 20px', fontFamily: '"Kanit", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
                * { box-sizing: border-box; }
                
                .admin-card { background: #FFFFFF; padding: 25px 30px; border-radius: 8px; border: 1px solid #E5E7EB; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 20px; }
                .admin-card-header { display: flex; alignItems: center; color: #1A365D; font-size: 18px; font-weight: 600; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #F3F4F6; }
                
                .input-group { margin-bottom: 18px; }
                .input-label { display: block; font-size: 14px; font-weight: 500; color: #4B5563; margin-bottom: 8px; }
                
                .admin-input { width: 100%; padding: 10px 14px; border: 1px solid #D1D5DB; border-radius: 6px; font-family: 'Kanit', sans-serif; font-size: 15px; color: #1F2937; transition: all 0.2s; background: #FFFFFF; }
                .admin-input:focus { outline: none; border-color: #1A365D; box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1); background: #F8FAFC; }
                textarea.admin-input { resize: vertical; min-height: 100px; line-height: 1.6; }
                
                .file-upload-wrapper { border: 1px dashed #CBD5E1; padding: 10px; border-radius: 6px; background: #F8FAFC; margin-top: 8px; }
                .file-upload-wrapper input[type="file"] { font-size: 13px; color: #6B7280; width: 100%; }
                
                .grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                @media (max-width: 768px) { .grid-2-cols { grid-template-columns: 1fr; } }
            `}</style>

            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ background: '#1A365D', padding: '12px', borderRadius: '8px', marginRight: '15px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <div>
                        <h2 style={{ margin: 0, color: '#1A365D', fontSize: '26px', fontWeight: '600' }}>เพิ่มคลังข้อสอบ (Admin)</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#6B7280', fontSize: '14px' }}>ระบบจัดการฐานข้อมูลข้อสอบสำหรับแอปพลิเคชัน</p>
                    </div>
                </div>
                
                {/* 🌟 กล่องอัพโหลด Excel 🌟 */}
                <div className="admin-card" style={{ borderTop: '4px solid #10B981', marginBottom: '30px' }}>
                    <div className="admin-card-header" style={{ color: '#059669', borderBottom: 'none', paddingBottom: 0, marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            นำเข้าข้อสอบรวดเดียวผ่านไฟล์ Excel (Bulk Upload)
                        </div>
                        <a href="/template_mock_exam.xlsx" download style={{ fontSize: '13px', background: '#ECFDF5', color: '#059669', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', border: '1px solid #A7F3D0', fontWeight: '500' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            โหลดไฟล์เทมเพลต
                        </a>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '25px' }}>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={handleExcelChange}
                            style={{ flex: 1, padding: '10px', border: '1px dashed #10B981', borderRadius: '6px', background: '#F0FDF4' }}
                        />
                        <button 
                            onClick={handleExcelSubmit}
                            disabled={isUploading || !excelFile}
                            style={{ padding: '12px 25px', background: isUploading ? '#9CA3AF' : '#10B981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isUploading || !excelFile ? 'not-allowed' : 'pointer', minWidth: '130px' }}
                        >
                            {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
                        </button>
                    </div>

                    {/* ส่วนแสดงตัวอย่าง 2 ตาราง (อังกฤษ และ ไทย) */}
                    <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                        
                        {/* ตารางที่ 1: ภาษาอังกฤษ (ต้นฉบับ) */}
                        <div style={{ color: '#1A365D', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                            1. รูปแบบหัวคอลัมน์ (Header) ต้นฉบับ <span style={{ color: '#EF4444' }}>*ต้องใช้ภาษาอังกฤษตามนี้เป๊ะๆ*</span>
                        </div>
                        <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#E2E8F0', color: '#1E293B' }}>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>category</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>part_name</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>difficulty_level</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>question_text</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>option_a</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>option_b</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>option_c</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>option_d</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>correct_answer</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>exam_year</th>
                                        <th style={{ padding: '8px', border: '1px solid #CBD5E1' }}>explanation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: '#FFFFFF', color: '#6B7280' }}>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>วิชาความรู้...</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>อนุกรม</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>4</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>3, 9, 6, 16...</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>ก. 23</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>ข. 27</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>ค. 29</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>ง. 42</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>ข.</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>2567</td>
                                        <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>อนุกรมชุดนี้...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ตารางที่ 2: ภาษาไทย (คำอธิบาย) */}
                        <div style={{ color: '#059669', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                            2. คำอธิบายความหมายของแต่ละคอลัมน์ (ภาษาไทย)
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                                <thead>
                                    <tr style={{ background: '#ECFDF5', color: '#065F46', lineHeight: '1.5' }}>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '12%' }}>หมวดวิชาหลัก</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '10%' }}>พาร์ทย่อย</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '8%', textAlign: 'center' }}>ความยาก (1-5)</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '20%' }}>โจทย์ข้อสอบ</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '8%' }}>ตัวเลือก A (ก.)</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '8%' }}>ตัวเลือก B (ข.)</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '8%' }}>ตัวเลือก C (ค.)</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '8%' }}>ตัวเลือก D (ง.)</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '8%', textAlign: 'center' }}>เฉลยที่ถูก</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '7%', textAlign: 'center' }}>ปีที่สอบ</th>
                                        <th style={{ padding: '10px 8px', border: '1px solid #A7F3D0', fontSize: '13px', width: '15%' }}>คำอธิบายเฉลย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: '#FFFFFF', color: '#6B7280' }}>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>วิชาความรู้...</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>อนุกรม</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5', textAlign: 'center' }}>4</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>3, 9, 6, 16...</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>ก. 23</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>ข. 27</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>ค. 29</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>ง. 42</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5', textAlign: 'center' }}>ข.</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5', textAlign: 'center' }}>2567</td>
                                        <td style={{ padding: '8px', border: '1px solid #D1FAE5' }}>อนุกรมชุดนี้...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>

                {/* เส้นแบ่งคั่นกลาง */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '40px 0 20px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: '#D1D5DB' }}></div>
                    <span style={{ padding: '0 15px', color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>หรือ กรอกข้อสอบทีละข้อแบบละเอียด</span>
                    <div style={{ flex: 1, height: '1px', background: '#D1D5DB' }}></div>
                </div>

                {/* 🌟 ฟอร์มกรอกทีละข้อ 🌟 */}
                <form onSubmit={handleSubmit}>
                    
                    {/* --- ส่วนตั้งค่าโจทย์ --- */}
                    <div className="admin-card" style={{ borderTop: '4px solid #1A365D' }}>
                        <div className="admin-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            ส่วนที่ 1: ตั้งค่าโจทย์คำถาม
                        </div>
                        
                        <div className="grid-2-cols">
                            <div className="input-group">
                                <label className="input-label">หมวดวิชา/พาร์ท</label>
                                <select name="part_id" value={formData.part_id} required onChange={handleTextChange} className="admin-input">
                                    <option value="" disabled>-- กรุณาเลือกหมวดวิชา --</option>
                                    {partList.map((part) => (
                                        <option key={part.id} value={part.id}>
                                            {part.category} - {part.part_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">ระดับความยาก</label>
                                <select name="difficulty_level" value={formData.difficulty_level} required onChange={handleTextChange} className="admin-input">
                                    <option value="1">1 (ง่ายมาก)</option>
                                    <option value="2">2 (ง่าย)</option>
                                    <option value="3">3 (ปานกลาง)</option>
                                    <option value="4">4 (ยาก)</option>
                                    <option value="5">5 (ยากมาก)</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">โจทย์คำถาม</label>
                            <textarea name="question_text" value={formData.question_text} required onChange={handleTextChange} className="admin-input" placeholder="พิมพ์โจทย์ข้อสอบที่นี่..."></textarea>
                        </div>
                        
                        <div className="input-group">
                            <label className="input-label">แนบรูปประกอบโจทย์ (ถ้ามี)</label>
                            <div className="file-upload-wrapper">
                                <input type="file" name="question_image" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                    </div>

                    {/* --- ส่วนช้อยส์ --- */}
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                            ส่วนที่ 2: ตัวเลือก (ก, ข, ค, ง)
                        </div>
                        
                        <div className="grid-2-cols">
                            <div className="input-group" style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <label className="input-label" style={{ color: '#1A365D', fontWeight: '600' }}>ตัวเลือก A</label>
                                <input type="text" name="option_a" value={formData.option_a} onChange={handleTextChange} className="admin-input" placeholder="ข้อความตัวเลือก A" />
                                <div className="file-upload-wrapper"><input type="file" name="option_a_image" accept="image/*" onChange={handleFileChange} /></div>
                            </div>

                            <div className="input-group" style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <label className="input-label" style={{ color: '#1A365D', fontWeight: '600' }}>ตัวเลือก B</label>
                                <input type="text" name="option_b" value={formData.option_b} onChange={handleTextChange} className="admin-input" placeholder="ข้อความตัวเลือก B" />
                                <div className="file-upload-wrapper"><input type="file" name="option_b_image" accept="image/*" onChange={handleFileChange} /></div>
                            </div>

                            <div className="input-group" style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <label className="input-label" style={{ color: '#1A365D', fontWeight: '600' }}>ตัวเลือก C</label>
                                <input type="text" name="option_c" value={formData.option_c} onChange={handleTextChange} className="admin-input" placeholder="ข้อความตัวเลือก C" />
                                <div className="file-upload-wrapper"><input type="file" name="option_c_image" accept="image/*" onChange={handleFileChange} /></div>
                            </div>

                            <div className="input-group" style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <label className="input-label" style={{ color: '#1A365D', fontWeight: '600' }}>ตัวเลือก D</label>
                                <input type="text" name="option_d" value={formData.option_d} onChange={handleTextChange} className="admin-input" placeholder="ข้อความตัวเลือก D" />
                                <div className="file-upload-wrapper"><input type="file" name="option_d_image" accept="image/*" onChange={handleFileChange} /></div>
                            </div>
                        </div>
                    </div>

                    {/* --- ส่วนเฉลย --- */}
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            ส่วนที่ 3: เฉลยและคำอธิบาย
                        </div>

                        <div className="grid-2-cols">
                            <div className="input-group">
                                <label className="input-label">เฉลยที่ถูกต้อง</label>
                                <select name="correct_answer" value={formData.correct_answer} required onChange={handleTextChange} className="admin-input" style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}>
                                    <option value="" disabled>-- เลือกเฉลย --</option>
                                    <option value="A">ตัวเลือก A</option>
                                    <option value="B">ตัวเลือก B</option>
                                    <option value="C">ตัวเลือก C</option>
                                    <option value="D">ตัวเลือก D</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">ปีที่ออกสอบ (ถ้ามี)</label>
                                <input type="text" name="exam_year" value={formData.exam_year} onChange={handleTextChange} className="admin-input" placeholder="เช่น 2565, 2566" />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">คำอธิบายเฉลย (ถ้ามี)</label>
                            <textarea name="explanation" value={formData.explanation} onChange={handleTextChange} className="admin-input" placeholder="อธิบายเหตุผลของเฉลยข้อนี้..."></textarea>
                        </div>
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '16px', backgroundColor: '#1A365D', color: '#FFFFFF', fontSize: '18px', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 6px rgba(26, 54, 93, 0.2)', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#2A4365'} onMouseOut={(e) => e.target.style.backgroundColor = '#1A365D'}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        บันทึกข้อสอบเข้าระบบ
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AdminAddQuestion;