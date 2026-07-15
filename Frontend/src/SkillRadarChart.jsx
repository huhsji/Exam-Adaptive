import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function SkillRadarChart({ userId, category }) {
    const [data, setData] = useState([]);

    const getThemeColor = () => {
        if (category === 'วิชาภาษาอังกฤษ') return { main: '#3182CE', bg: '#EBF8FF' }; 
        if (category === 'วิชาความรู้และลักษณะการเป็นข้าราชการที่ดี') return { main: '#D69E2E', bg: '#FEFCBF' }; 
        return { main: '#38A169', bg: '#F0FFF4' }; 
    };
    
    const theme = getThemeColor();

    useEffect(() => {
        const fetchRadarData = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/practice/radar-chart?user_id=${userId}&category=${category}`);
                const result = await res.json();
                if (res.ok) setData(result);
            } catch (error) {
                console.error("Error fetching radar data:", error);
            }
        };

        if (userId && category) fetchRadarData();
    }, [userId, category]);

    const formatLabel = (name) => {
        if (!name) return '';
        let shortName = name.replace(/^การ/, '').replace(/^ความรู้เกี่ยวกับ/, '');
        return shortName.length > 15 ? shortName.substring(0, 15) + '...' : shortName;
    };

    const getLevelDescription = (level) => {
        if (level >= 5) return 'ดีเยี่ยม (Level 5)';
        if (level >= 4) return 'ดีมาก (Level 4)';
        if (level >= 3) return 'ดี (Level 3)';
        if (level >= 2) return 'พอใช้ (Level 2)';
        return 'ควรปรับปรุง (Level 1)';
    };

    if (data.length === 0) return (
        <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <span style={{ color: '#94A3B8' }}>กำลังโหลดกราฟ...</span>
        </div>
    );

    return (
        <div style={{ 
            width: '100%', 
            height: 440, 
            background: '#FFFFFF', 
            borderRadius: '16px', 
            padding: '0', 
            border: '1px solid #E2E8F0', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden', 
            transition: 'transform 0.3s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ 
                background: theme.bg, 
                borderBottom: `2px solid ${theme.main}`,
                padding: '16px 20px',
                textAlign: 'center'
            }}>
                <h3 style={{ 
                    color: '#1A365D', 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: '600',
                    lineHeight: '1.4'
                }}>
                    {category}
                </h3>
            </div>
            
            <div style={{ flex: 1, width: '100%', padding: '20px 10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="50%" data={data}>
                        <PolarGrid stroke="#CBD5E1" strokeDasharray="3 3" /> 
                        
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tickFormatter={formatLabel} 
                            tick={{ fill: '#475569', fontSize: 10.5, fontWeight: 500 }} 
                        />
                        
                        <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 5]} 
                            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                            tickCount={6}
                        />
                        
                        <Radar 
                            name="ระดับศักยภาพ" 
                            dataKey="level" 
                            stroke={theme.main} 
                            strokeWidth={2} 
                            fill={theme.main} 
                            fillOpacity={0.35} 
                        />
                        
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: `1px solid ${theme.main}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '13px', fontFamily: '"Kanit", sans-serif' }}
                            itemStyle={{ color: theme.main, fontWeight: 'bold' }}
                            formatter={(value) => [`${getLevelDescription(value)}`, 'ระดับ']}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            
            <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '10px 20px', fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                <span>วัดผลจาก: {data.length} หมวดย่อย</span>
                <span style={{ color: theme.main, fontWeight: '600' }}>อัปเดตล่าสุด: วันนี้</span>
            </div>
        </div>
    );
}