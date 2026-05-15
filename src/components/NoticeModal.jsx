import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Calendar, ShieldCheck } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

/**
 * Optimized Notice Modal to eliminate typing lag.
 * By isolating the state here, the entire Dashboard doesn't re-render on every keystroke.
 */
const NoticeModal = ({ notice, onClose, onSave, currentUser }) => {
  const [formData, setFormData] = useState({
    id: notice?.id || null,
    title: notice?.title || '',
    content: notice?.content || '',
    start_at: notice?.start_at || new Date().toISOString().slice(0, 16),
    end_at: notice?.end_at || '',
    is_permanent: !!notice?.is_permanent,
    priority: notice?.priority || 'Normal',
    type: notice?.type || 'General',
    author: notice?.author || (currentUser?.name || 'Admin'),
    status: notice?.status || 'Active'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle auto-expiry disable logic
  const handlePermanentToggle = (e) => {
    setFormData({
      ...formData,
      is_permanent: e.target.checked,
      end_at: e.target.checked ? '' : formData.end_at
    });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content || formData.content === '<br>') {
      alert("Please provide both a title and content.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', 
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', 
      backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' 
    }}>
      <div className="card" style={{ 
        width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--color-border)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--color-primary)' }}>
              <Send size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{formData.id ? 'Edit Announcement' : 'New Internal Announcement'}</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Communicate with your team in real-time.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '50%', background: 'transparent' }} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Announcement Title</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder="e.g. Important: Office Relocation Details"
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} /> Start Displaying From
              </label>
              <input 
                type="datetime-local" 
                className="form-input"
                value={formData.start_at ? formData.start_at.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} /> Expiry (Optional)
              </label>
              <input 
                type="datetime-local" 
                className="form-input"
                disabled={formData.is_permanent}
                value={formData.end_at ? formData.end_at.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                style={{ opacity: formData.is_permanent ? 0.4 : 1 }}
              />
            </div>
          </div>

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            padding: '1rem', backgroundColor: 'var(--color-primary-light)', 
            borderRadius: '10px', border: '1px solid var(--color-primary)', borderStyle: 'dashed' 
          }}>
            <input 
              type="checkbox" 
              id="is_permanent_check"
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              checked={formData.is_permanent}
              onChange={handlePermanentToggle}
            />
            <label htmlFor="is_permanent_check" style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-primary)', cursor: 'pointer' }}>
              Unlimited Duration (Display this notice permanently until manually removed)
            </label>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Notice Content</label>
            <RichTextEditor 
              value={formData.content} 
              onChange={(content) => setFormData({ ...formData, content })}
              height="200px"
              placeholder="Type your announcement here..."
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Discard</button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.75rem 2rem', fontWeight: '700', gap: '0.5rem' }}
            disabled={isSubmitting || !formData.title.trim()}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Syncing...' : (formData.id ? 'Save Changes' : 'Publish to Board')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeModal;
