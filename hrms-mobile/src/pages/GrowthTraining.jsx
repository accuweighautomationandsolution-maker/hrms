import React from 'react';
import { GraduationCap, ChevronLeft, Play, Clock, Star } from 'lucide-react';

const GrowthTraining = ({ onNavigate }) => {
  const courses = [
    { id: 1, title: 'Safety at Workplace', duration: '45 mins', progress: 100, category: 'Compliance' },
    { id: 2, title: 'Advanced React Native', duration: '4 hours', progress: 35, category: 'Technical' },
    { id: 3, title: 'Leadership Essentials', duration: '2 hours', progress: 0, category: 'Management' }
  ];

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Growth</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div className="m-card" style={{ background: '#0f172a', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Learning Points</p>
              <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '800' }}>1,250 XP</h3>
            </div>
            <Star size={32} color="#f59e0b" fill="#f59e0b" />
          </div>
          <div style={{ marginTop: '1rem', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '65%', height: '100%', background: '#6366f1' }}></div>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', opacity: 0.6 }}>Next Level: 2,000 XP</p>
        </div>

        <h3 className="m-card-title">My Courses</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {courses.map(course => (
            <div key={course.id} className="m-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', color: '#64748b' }}>
                  {course.category}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--m-text-muted)', fontSize: '0.75rem' }}>
                  <Clock size={12} />
                  <span>{course.duration}</span>
                </div>
              </div>
              <h4 style={{ margin: '0.75rem 0', fontSize: '1rem' }}>{course.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${course.progress}%`, height: '100%', background: 'var(--m-primary)' }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--m-text-muted)', width: '35px' }}>{course.progress}%</span>
                <button style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'var(--m-primary)', 
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Play size={14} fill="white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GrowthTraining;
