import React, { useState, useEffect, useMemo } from 'react';
import { X, Star, Save, AlertCircle, Info, ChevronRight, ChevronLeft, CheckCircle, ShieldCheck, Clock, Printer } from 'lucide-react';
import { dataService } from '../utils/dataService';

const FeedbackPortal = ({ empId, reviewType, isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [employee, setEmployee] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Evaluation State Schema
  const [formData, setFormData] = useState({
    evaluations: {
      attendance: { rating: 0, remarks: '' },
      performance_quality: { rating: 0, remarks: '' },
      performance_timeliness: { rating: 0, remarks: '' },
      performance_productivity: { rating: 0, remarks: '' },
      role_understanding: { rating: 0, remarks: '' },
      behavior_attitude: { rating: 0, remarks: '' },
      communication: { rating: 0, remarks: '' },
      teamwork: { rating: 0, remarks: '' },
      initiative: { rating: 0, remarks: '' },
    },
    additional: {
      concern: '',
      strength: '',
      improvement: ''
    },
    recommendation: '', // 'Permanent', 'Extend', 'Rejected', 'Release'
    extensionPeriod: '', 
    conditional: {
      riskAssessment: '',
      improvementPlan: '',
      justification: ''
    },
    reviewer: {
      primary: '',
      secondary: ''
    },
    finalRemarks: '',
    summaryComment: ''
  });

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && empId) {
        try {
          const [emp, existing] = await Promise.all([
            dataService.getEmployeeById(empId),
            dataService.getFeedback(empId, reviewType)
          ]);
          setEmployee(emp);
          
          if (existing) {
            setFormData(existing);
            setIsSubmitted(true);
          } else {
            setIsSubmitted(false);
          }
        } catch (err) {
          console.error("FeedbackPortal: Failed to load data", err);
        }
      }
    };
    loadData();
  }, [isOpen, empId, reviewType]);

  const handleRating = (section, rating) => {
    if (isSubmitted) return;
    setFormData(prev => ({
      ...prev,
      evaluations: {
        ...prev.evaluations,
        [section]: { ...prev.evaluations[section], rating }
      }
    }));
  };

  const handleRemark = (section, remarks) => {
    if (isSubmitted) return;
    setFormData(prev => ({
      ...prev,
      evaluations: {
        ...prev.evaluations,
        [section]: { ...prev.evaluations[section], remarks }
      }
    }));
  };

  const overallRating = (() => {
    const vals = Object.values(formData.evaluations).map(e => e.rating);
    const filled = vals.filter(v => v > 0);
    if (filled.length === 0) return 0;
    return (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1);
  })();

  const canProceed = () => {
    if (step === 1) return formData.evaluations.attendance.rating > 0 && formData.evaluations.attendance.remarks;
    if (step === 2) return formData.evaluations.performance_quality.rating > 0 && formData.evaluations.performance_quality.remarks && 
                           formData.evaluations.performance_timeliness.rating > 0 && formData.evaluations.performance_timeliness.remarks &&
                           formData.evaluations.performance_productivity.rating > 0 && formData.evaluations.performance_productivity.remarks;
    if (step === 3) return formData.evaluations.role_understanding.rating > 0 && formData.evaluations.role_understanding.remarks;
    if (step === 4) return formData.evaluations.behavior_attitude.rating > 0 && formData.evaluations.behavior_attitude.remarks;
    if (step === 5) return formData.evaluations.communication.rating > 0 && formData.evaluations.communication.remarks;
    if (step === 6) return formData.evaluations.teamwork.rating > 0 && formData.evaluations.teamwork.remarks;
    if (step === 7) return formData.evaluations.initiative.rating > 0 && formData.evaluations.initiative.remarks;
    if (step === 8) {
      if (!formData.recommendation) return false;
      if (formData.recommendation === 'Extend' && (!formData.extensionPeriod || !formData.conditional.riskAssessment || !formData.conditional.improvementPlan)) return false;
      if (formData.recommendation === 'Rejected' && !formData.conditional.justification) return false;
      if (formData.recommendation === 'Release' && !formData.conditional.justification) return false;
      return formData.finalRemarks;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!canProceed()) {
      alert('CRITICAL ERROR: Please complete all mandatory sections, ratings, and remarks before submission.');
      return;
    }

    const submission = {
      ...formData,
      empId: Number(empId),
      reviewType,
      overallRating: Number(overallRating),
      reviewDate: new Date().toISOString()
    };

    dataService.saveFeedback(submission);
    setIsSubmitted(true);
    alert('Evaluation Submitted & Locked Successfully.');
    onClose();
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    
    // Convert ratings to text
    const getRatingText = (val) => ['Poor', 'Below Avg', 'Average', 'Good', 'Excellent'][val - 1] || 'N/A';

    const html = `
      <html>
        <head>
          <title>\${employee.name} - Feedback Report</title>
          <style>
            @media print {
              @page { margin: 15mm; }
              body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 10pt; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
              .logo { font-size: 18pt; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
              .title { font-size: 14pt; font-weight: 600; text-align: right; }
              .subtitle { font-size: 10pt; color: #64748b; text-align: right; margin-top: 5px; }
              
              .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
              .info-group { margin-bottom: 5px; }
              .info-label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
              .info-value { font-weight: 600; font-size: 10pt; }
              
              .section { margin-bottom: 20px; page-break-inside: avoid; }
              .section-title { font-size: 11pt; font-weight: 600; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; }
              .rating-badge { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 12px; font-size: 9pt; font-weight: 600; }
              .remarks { font-size: 9.5pt; color: #334155; background: #fff; padding: 10px; border-left: 3px solid #cbd5e1; white-space: pre-wrap; }
              
              .summary-box { border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin-top: 30px; page-break-inside: avoid; }
              .summary-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
              .overall-score { font-size: 24pt; font-weight: 800; color: #2563eb; }
              .recommendation { display: inline-block; background: #2563eb; color: white; padding: 5px 12px; border-radius: 4px; font-weight: 600; font-size: 10pt; margin-top: 10px; }
              
              .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Accuweigh HRMS</div>
            <div>
              <div class="title">\${reviewType} Evaluation</div>
              <div class="subtitle">Generated on: \${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="employee-info">
            <div>
              <div class="info-group"><div class="info-label">Employee Name</div><div class="info-value">\${employee.name}</div></div>
              <div class="info-group"><div class="info-label">Employee Code</div><div class="info-value">\${employee.empCode}</div></div>
            </div>
            <div>
              <div class="info-group"><div class="info-label">Department</div><div class="info-value">\${employee.department}</div></div>
              <div class="info-group"><div class="info-label">Role/Designation</div><div class="info-value">\${employee.role}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title"><span>1. Attendance & Punctuality</span> <span class="rating-badge">\${formData.evaluations.attendance.rating}/5 (\${getRatingText(formData.evaluations.attendance.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.attendance.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>2a. Quality of Work</span> <span class="rating-badge">\${formData.evaluations.performance_quality.rating}/5 (\${getRatingText(formData.evaluations.performance_quality.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.performance_quality.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>2b. Timely Completion</span> <span class="rating-badge">\${formData.evaluations.performance_timeliness.rating}/5 (\${getRatingText(formData.evaluations.performance_timeliness.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.performance_timeliness.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>2c. Productivity</span> <span class="rating-badge">\${formData.evaluations.performance_productivity.rating}/5 (\${getRatingText(formData.evaluations.performance_productivity.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.performance_productivity.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>3. Understanding the Role</span> <span class="rating-badge">\${formData.evaluations.role_understanding.rating}/5 (\${getRatingText(formData.evaluations.role_understanding.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.role_understanding.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>4. Behavior & Attitude</span> <span class="rating-badge">\${formData.evaluations.behavior_attitude.rating}/5 (\${getRatingText(formData.evaluations.behavior_attitude.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.behavior_attitude.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>5. Communication Skills</span> <span class="rating-badge">\${formData.evaluations.communication.rating}/5 (\${getRatingText(formData.evaluations.communication.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.communication.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>6. Teamwork & Collaboration</span> <span class="rating-badge">\${formData.evaluations.teamwork.rating}/5 (\${getRatingText(formData.evaluations.teamwork.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.teamwork.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="section">
            <div class="section-title"><span>7. Initiative & Ownership</span> <span class="rating-badge">\${formData.evaluations.initiative.rating}/5 (\${getRatingText(formData.evaluations.initiative.rating)})</span></div>
            <div class="remarks">\${formData.evaluations.initiative.remarks || 'No remarks provided.'}</div>
          </div>

          <div class="summary-box">
            <div class="summary-header">
              <div>
                <h2 style="margin:0; font-size: 14pt; color: #0f172a;">Final Summary & Recommendation</h2>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 8pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Overall Rating</div>
                <div class="overall-score">\${overallRating} / 5.0</div>
              </div>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong>Primary Recommendation:</strong><br/>
              <span class="recommendation">\${formData.recommendation} \${formData.recommendation === 'Extend' ? `(\${formData.extensionPeriod})` : ''}</span>
            </div>

            \${formData.recommendation === 'Extend' ? `
              <div style="margin-bottom: 10px;"><strong>Risk Assessment:</strong><br/><div class="remarks">\${formData.conditional.riskAssessment}</div></div>
              <div style="margin-bottom: 10px;"><strong>Improvement Plan (PIP):</strong><br/><div class="remarks">\${formData.conditional.improvementPlan}</div></div>
            ` : ''}

            \${(formData.recommendation === 'Rejected' || formData.recommendation === 'Release') ? `
              <div style="margin-bottom: 10px;"><strong>Justification:</strong><br/><div class="remarks">\${formData.conditional.justification}</div></div>
            ` : ''}

            <div style="margin-top: 15px;">
              <strong>Manager / Head Remarks:</strong><br/>
              <div class="remarks">\${formData.finalRemarks || 'No final remarks provided.'}</div>
            </div>
          </div>
          
          <div class="footer">
            Official HRMS Document &bull; This is a computer-generated report and does not require a physical signature.
          </div>
        </body>
      </html>
    `;
    
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for styles to apply before printing
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  if (!isOpen || !employee) return null;

  const RatingStars = ({ section, value }) => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button 
          key={star} 
          onClick={() => handleRating(section, star)}
          style={{ background: 'none', border: 'none', cursor: isSubmitted ? 'default' : 'pointer', padding: 0 }}
        >
          <Star 
            size={24} 
            fill={star <= value ? 'var(--color-warning)' : 'none'} 
            color={star <= value ? 'var(--color-warning)' : 'var(--color-border)'} 
          />
        </button>
      ))}
      <span style={{ marginLeft: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
        {['Poor', 'Below Avg', 'Average', 'Good', 'Excellent'][value - 1] || 'Select Rating'}
      </span>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '900px', padding: 0, height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={24} color="var(--color-primary)" /> {reviewType} Evaluation Log
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Standardized performance matrix for <strong>{employee.name}</strong> ({employee.empCode})
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isSubmitted && (
              <button 
                onClick={handlePrint} 
                className="btn btn-outline" 
                style={{ padding: '0.4rem 0.8rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                title="Print / Download PDF"
              >
                <Printer size={18} /> Print Report
              </button>
            )}
            <button onClick={onClose} className="btn btn-ghost"><X size={24}/></button>
          </div>
        </div>

        {/* Info Bar (Read Only) */}
        <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.75rem' }}>
          <div><label style={{color:'var(--color-text-muted)'}}>Department</label><br/><strong>{employee.department}</strong></div>
          <div><label style={{color:'var(--color-text-muted)'}}>Designation</label><br/><strong>{employee.role}</strong></div>
          <div><label style={{color:'var(--color-text-muted)'}}>Join Date</label><br/><strong>{employee.joiningDate}</strong></div>
          <div><label style={{color:'var(--color-text-muted)'}}>Context</label><br/><span className="badge badge-primary">{reviewType}</span></div>
        </div>

        {/* Progress Tracker */}
        <div style={{ padding: '1rem 2rem', display: 'flex', gap: '0.5rem', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', backgroundColor: step >= s ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: '2px' }} />
          ))}
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem' }}>
          
          {step === 1 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20}/> 1. Attendance & Punctuality</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Evaluate the employee's timeliness, consistency, and leave pattern over the review period.</p>
              
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Attendance Rating *</label>
                <RatingStars section="attendance" value={formData.evaluations.attendance.rating} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandatory Remarks *</label>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  rows="4" 
                  value={formData.evaluations.attendance.remarks}
                  onChange={(e) => handleRemark('attendance', e.target.value)}
                  placeholder="Provide specific details about attendance behavior..."
                  disabled={isSubmitted}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem' }}>2. Work Performance</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div className="card" style={{ border: '1px solid var(--color-border)' }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>a. Quality of Work (Accuracy & Attention)</label>
                  <RatingStars section="performance_quality" value={formData.evaluations.performance_quality.rating} />
                  <textarea className="form-input" style={{ width: '100%', marginTop: '1rem' }} rows="2" value={formData.evaluations.performance_quality.remarks} onChange={e => handleRemark('performance_quality', e.target.value)} disabled={isSubmitted} />
                </div>

                <div className="card" style={{ border: '1px solid var(--color-border)' }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>b. Timely Completion (Deadlines)</label>
                  <RatingStars section="performance_timeliness" value={formData.evaluations.performance_timeliness.rating} />
                  <textarea className="form-input" style={{ width: '100%', marginTop: '1rem' }} rows="2" value={formData.evaluations.performance_timeliness.remarks} onChange={e => handleRemark('performance_timeliness', e.target.value)} disabled={isSubmitted} />
                </div>

                <div className="card" style={{ border: '1px solid var(--color-border)' }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>c. Productivity (Output vs Expectations)</label>
                  <RatingStars section="performance_productivity" value={formData.evaluations.performance_productivity.rating} />
                  <textarea className="form-input" style={{ width: '100%', marginTop: '1rem' }} rows="2" value={formData.evaluations.performance_productivity.remarks} onChange={e => handleRemark('performance_productivity', e.target.value)} disabled={isSubmitted} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem' }}>3. Understanding the Role</h3>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Rating *</label>
                <RatingStars section="role_understanding" value={formData.evaluations.role_understanding.rating} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandatory Remarks *</label>
                <textarea className="form-input" style={{ width: '100%' }} rows="4" value={formData.evaluations.role_understanding.remarks} onChange={e => handleRemark('role_understanding', e.target.value)} disabled={isSubmitted} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem' }}>4. Behavior & Attitude</h3>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Rating *</label>
                <RatingStars section="behavior_attitude" value={formData.evaluations.behavior_attitude.rating} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandatory Remarks *</label>
                <textarea className="form-input" style={{ width: '100%' }} rows="4" value={formData.evaluations.behavior_attitude.remarks} onChange={e => handleRemark('behavior_attitude', e.target.value)} disabled={isSubmitted} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem' }}>5. Communication Skills</h3>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Rating *</label>
                <RatingStars section="communication" value={formData.evaluations.communication.rating} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandatory Remarks *</label>
                <textarea className="form-input" style={{ width: '100%' }} rows="4" value={formData.evaluations.communication.remarks} onChange={e => handleRemark('communication', e.target.value)} disabled={isSubmitted} />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem' }}>6. Teamwork & Collaboration</h3>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Rating *</label>
                <RatingStars section="teamwork" value={formData.evaluations.teamwork.rating} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandatory Remarks *</label>
                <textarea className="form-input" style={{ width: '100%' }} rows="4" value={formData.evaluations.teamwork.remarks} onChange={e => handleRemark('teamwork', e.target.value)} disabled={isSubmitted} />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="animation-slide-up">
              <h3 style={{ marginBottom: '1.5rem' }}>7. Initiative & Ownership</h3>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Rating *</label>
                <RatingStars section="initiative" value={formData.evaluations.initiative.rating} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandatory Remarks *</label>
                <textarea className="form-input" style={{ width: '100%' }} rows="4" value={formData.evaluations.initiative.remarks} onChange={e => handleRemark('initiative', e.target.value)} disabled={isSubmitted} />
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="animation-slide-up">
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                   <div>
                      <h3 style={{ margin: 0 }}>Final Summary & Recommendation</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Aggregate evaluation across all sections.</p>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>OVERALL RATING</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-primary)' }}>{overallRating} / 5.0</div>
                   </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">Primary Recommendation *</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      className={`btn ${formData.recommendation === 'Permanent' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, recommendation: 'Permanent' }))}
                      disabled={isSubmitted}
                    >
                      Permanent (Confirm)
                    </button>
                    <button 
                      className={`btn ${formData.recommendation === 'Extend' ? 'btn-warning' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, recommendation: 'Extend' }))}
                      disabled={isSubmitted}
                    >
                      Extend Probation
                    </button>
                    <button 
                      className={`btn ${formData.recommendation === 'Rejected' ? 'btn-danger' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, recommendation: 'Rejected' }))}
                      disabled={isSubmitted}
                    >
                      Terminate
                    </button>
                    <button 
                      className={`btn ${formData.recommendation === 'Release' ? 'btn-ghost' : 'btn-outline'}`}
                      style={{ flex: 1, color: formData.recommendation === 'Release' ? 'var(--color-text-main)' : 'inherit' }}
                      onClick={() => setFormData(prev => ({ ...prev, recommendation: 'Release' }))}
                      disabled={isSubmitted}
                    >
                      Release Candidate
                    </button>
                  </div>
                </div>

                {formData.recommendation === 'Extend' && (
                  <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--color-warning)', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Extension Duration *</label>
                      <select className="form-input" style={{ width: '100%' }} value={formData.extensionPeriod} onChange={e => setFormData(p => ({ ...p, extensionPeriod: e.target.value }))} disabled={isSubmitted}>
                        <option value="">Select duration...</option>
                        <option value="1 Month">1 Month Extension</option>
                        <option value="3 Months">3 Months Extension</option>
                        <option value="6 Months">6 Months Extension</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Risk Assessment *</label>
                      <textarea className="form-input" style={{ width: '100%' }} value={formData.conditional.riskAssessment} onChange={e => setFormData(p => ({...p, conditional: {...p.conditional, riskAssessment: e.target.value}}))} placeholder="Identify potential risks of extension..." disabled={isSubmitted} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Improvement Plan (PIP) *</label>
                      <textarea className="form-input" style={{ width: '100%' }} value={formData.conditional.improvementPlan} onChange={e => setFormData(p => ({...p, conditional: {...p.conditional, improvementPlan: e.target.value}}))} placeholder="Define targets for the extension period..." disabled={isSubmitted} />
                    </div>
                  </div>
                )}

                {(formData.recommendation === 'Rejected' || formData.recommendation === 'Release') && (
                  <div className="animation-slide-up" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--color-danger)', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Justification for Decision *</label>
                      <textarea className="form-input" style={{ width: '100%' }} value={formData.conditional.justification} onChange={e => setFormData(p => ({...p, conditional: {...p.conditional, justification: e.target.value}}))} placeholder="Reasoning for termination / release..." disabled={isSubmitted} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Manager / Head Remarks *</label>
                  <textarea className="form-input" style={{ width: '100%' }} rows="5" value={formData.finalRemarks} onChange={e => setFormData(p => ({...p, finalRemarks: e.target.value}))} placeholder="Summarize your final feedback..." disabled={isSubmitted} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-outline" onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1}>
            <ChevronLeft size={18}/> Back
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
             {step < 8 ? (
               <button 
                 className="btn btn-primary" 
                 onClick={() => setStep(s => s + 1)}
                 disabled={!canProceed()}
                 style={{ opacity: canProceed() ? 1 : 0.5 }}
               >
                 Next Section <ChevronRight size={18}/>
               </button>
             ) : (
               <button 
                 className="btn btn-success" 
                 onClick={handleSubmit}
                 disabled={isSubmitted || !canProceed()}
                 style={{ gap: '0.5rem' }}
               >
                 {isSubmitted ? <CheckCircle size={18}/> : <Save size={18}/>}
                 {isSubmitted ? 'Evaluation Locked' : 'Authorize & Submit Evaluation'}
               </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FeedbackPortal;
