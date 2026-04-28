import React from 'react';
import { ShieldCheck, ChevronLeft, AlertTriangle, FileCheck, CheckCircle2 } from 'lucide-react';
import { dataService } from '@/utils/dataService';

const ComplianceHub = ({ onNavigate }) => {
  const [complianceItems, setComplianceItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await dataService.getStatutoryUpdates();
        setComplianceItems(data || []);
      } catch (err) {
        console.error("Failed to load compliance data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--m-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Compliance</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div className="m-card" style={{ borderLeft: '4px solid var(--m-warning)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertTriangle color="var(--m-warning)" size={24} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Pending Acknowledgment</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>You have 1 policy pending review.</p>
          </div>
          <button style={{ 
            padding: '0.4rem 0.8rem', 
            borderRadius: '8px', 
            background: 'var(--m-warning)', 
            color: 'white',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            Review
          </button>
        </div>

        <h3 className="m-card-title">My Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {complianceItems.map(item => (
            <div key={item.id} className="m-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: item.status === 'Completed' ? '#f0fdf4' : '#fff7ed', borderRadius: '12px' }}>
                {item.status === 'Completed' ? <CheckCircle2 color="#16a34a" size={24} /> : <FileCheck color="#f59e0b" size={24} />}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{item.title}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>
                  {item.status === 'Completed' ? `Acknowledged on ${item.date}` : 'Awaiting your signature'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplianceHub;
