import React from 'react';
import SkillRadarChart from './SkillRadarChart';

export default function DashboardCharts({ userId }) {
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto 40px auto', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: '#1A365D', margin: '0 0 10px 0', fontSize: '24px', fontWeight: '600' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', verticalAlign: 'middle' }}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    รายงานผลการวิเคราะห์ศักยภาพ (Radar Dashboard)
                </h2>
                <p style={{ color: '#6B7280', fontSize: '15px', margin: 0 }}>วิเคราะห์จุดแข็ง-จุดอ่อนแยกตามหมวดวิชาหลัก (Level 1-5)</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', padding: '0 20px' }}>
                <SkillRadarChart userId={userId} category="วิชาความรู้ความสามารถในการคิดวิเคราะห์" />
                <SkillRadarChart userId={userId} category="วิชาภาษาอังกฤษ" />
                <SkillRadarChart userId={userId} category="วิชาความรู้และลักษณะการเป็นข้าราชการที่ดี" />
            </div>
        </div>
    );
}