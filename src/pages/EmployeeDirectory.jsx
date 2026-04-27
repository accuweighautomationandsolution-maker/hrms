import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { MoreVertical, Search, Filter, UserPlus, FileText, MapPin, Briefcase, ShieldCheck, UploadCloud, AlertCircle, IndianRupee, Lock, Save, Download, FileSpreadsheet, Printer, MessageSquareShare, Trash2, CreditCard, TrendingUp } from 'lucide-react';
import SalaryStructure from './SalaryStructure';
import { dataService } from '../utils/dataService';
import FeedbackPortal from '../components/FeedbackPortal';
import { useNotification } from '../context/NotificationContext';

const EmployeeDirectory = ({ userRole }) => {
  const { showNotification } = useNotification();
  const isEmployee = userRole !== 'management';
  
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Feedback Portal State
  const [feedbackConfig, setFeedbackConfig] = useState({ isOpen: false, empId: null, type: 'Appraisal Review' });
  
  const location = useLocation();
  const navigate = useNavigate();

  // Form State
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '', dob: '', contact: '', altContact: '', email: '', marital: '', gender: '', bloodGroup: '',
    aadharNo: '', panNo: '', dlNo: '', dlExpiry: '', dlType: '', passportNo: '', passportExpiry: '',
    bankAccountName: '', bankAccountNumber: '', bankName: '', bankIfsc: '', bankBranch: '',
    hasMediclaim: false, mediclaimPolicies: [{ policyNo: '', amount: '', company: '' }],
    hasTermInsurance: false, termInsurancePolicies: [{ policyNo: '', amount: '', company: '' }],
    empId: '', biometricCode: '', role: '', department: '', joinDate: '', probType: 'Probation', probPeriod: '6 Months', exitDate: '', empCategory: 'Staff Employee',
    presAddress: '', permAddress: '', sameAsPresent: false,
    hasPF: false, uan: '', pfMemberId: '',
    hasESIC: false, esicIp: '',
    salaryConfig: null
  });

  const [departments, setDepartments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    setDepartments(dataService.getDepartments());
  }, []);

  useEffect(() => {
    setEmployees(dataService.getEmployees());
  }, []);

  const handleInput = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrorMsg('');
  };

  const handlePolicyChange = (type, index, field, value) => {
    setForm(prev => {
      const updatedPolicies = [...prev[type]];
      updatedPolicies[index] = { ...updatedPolicies[index], [field]: value };
      return { ...prev, [type]: updatedPolicies };
    });
  };

  const addPolicy = (type) => {
    setForm(prev => ({ ...prev, [type]: [...prev[type], { policyNo: '', amount: '', company: '' }] }));
  };

  const removePolicy = (type, index) => {
    setForm(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    let hasError = false;

    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        showNotification(`File ${file.name} exceeds the 2 MB limit.`, 'error');
        hasError = true;
      } else {
        validFiles.push({ name: file.name, size: file.size, type: file.type });
      }
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      showNotification(`${validFiles.length} document(s) added to vault.`, 'success');
    }
    e.target.value = null; // reset input
  };

  const handleRemoveFile = (indexToRemove) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const resetForm = () => {
    setForm({
      firstName: '', middleName: '', lastName: '', dob: '', contact: '', altContact: '', email: '', marital: '', gender: '', bloodGroup: '',
      aadharNo: '', panNo: '', dlNo: '', dlExpiry: '', dlType: '', passportNo: '', passportExpiry: '',
      bankAccountName: '', bankAccountNumber: '', bankName: '', bankIfsc: '', bankBranch: '',
      hasMediclaim: false, mediclaimPolicies: [{ policyNo: '', amount: '', company: '' }],
      hasTermInsurance: false, termInsurancePolicies: [{ policyNo: '', amount: '', company: '' }],
      empId: '', biometricCode: '', joinDate: '', probPeriod: '', probType: '', exitDate: '', empCategory: '',
      presAddress: '', permAddress: '', sameAsPresent: false,
      hasPF: false, uan: '', pfMemberId: '',
      hasESIC: false, esicIp: '',
      salaryConfig: null
    });
    setUploadedFiles([]);
    setErrorMsg('');
  };

  const handleEditEmployee = (emp) => {
    const names = (emp.name || '').split(' ');
    const salary = dataService.getSalaryStructure(emp.id);
    setForm(prev => ({
      ...prev,
      id: emp.id,
      firstName: names[0] || '',
      middleName: names.length > 2 ? names[1] : '',
      lastName: names.length > 2 ? names.slice(2).join(' ') : (names[1] || ''),
      email: emp.email,
      empId: emp.empCode || '',
      biometricCode: emp.biometricCode || '',
      probType: emp.empType || 'Select...',
      empCategory: emp.category,
      contact: emp.contact || '',
      role: emp.role || '',
      department: emp.department || '',
      joinDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      presAddress: emp.presAddress || '',
      permAddress: emp.permAddress || '',
      sameAsPresent: !!(emp.presAddress && emp.presAddress === emp.permAddress),
      hasPF: !!emp.uanNumber,
      uan: emp.uanNumber || '',
      pfMemberId: emp.pfMemberId || '',
      hasESIC: !!emp.esicNumber,
      esicIp: emp.esicNumber || '',
      bloodGroup: emp.bloodGroup || '',
      aadharNo: emp.aadharNo || '',
      panNo: emp.panNo || '',
      dlNo: emp.dlNo || '',
      dlExpiry: emp.dlExpiry || '',
      dlType: emp.dlType || '',
      passportNo: emp.passportNo || '',
      passportExpiry: emp.passportExpiry || '',
      bankAccountName: emp.bankAccountName || '',
      bankAccountNumber: emp.bankAccountNumber || '',
      bankName: emp.bankName || '',
      bankIfsc: emp.bankIfsc || '',
      bankBranch: emp.bankBranch || '',
      hasMediclaim: !!emp.hasMediclaim,
      mediclaimPolicies: (emp.mediclaimPolicies && emp.mediclaimPolicies.length > 0) ? emp.mediclaimPolicies : [{ policyNo: '', amount: '', company: '' }],
      hasTermInsurance: !!emp.hasTermInsurance,
      termInsurancePolicies: (emp.termInsurancePolicies && emp.termInsurancePolicies.length > 0) ? emp.termInsurancePolicies : [{ policyNo: '', amount: '', company: '' }],
      salaryConfig: salary || null
    }));
    setUploadedFiles([]);
    setActiveTab(1);
    setShowModal(true);
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this employee record? This action is logged.')) {
      const updated = dataService.deleteEmployee(id);
      setEmployees(updated);
      showNotification('Employee record purged successfully.', 'success');
    }
  };

  useEffect(() => {
    if (location.state && location.state.onboardCandidate) {
      const { candidateName, candidateMiddleName, candidateLastName, addressLine1, city, state, zipCode, salaryData, empCategory, hasPF, hasESIC, roleApplied } = location.state;
      
      setForm(prev => ({ 
        ...prev, 
        firstName: candidateName || '', 
        middleName: candidateMiddleName || '',
        lastName: candidateLastName || '',
        presAddress: `${addressLine1 || ''} ${city || ''} ${state || ''} ${zipCode || ''}`.trim(),
        role: roleApplied || '',
        empCategory: empCategory || 'Staff Employee',
        hasPF: hasPF || false,
        hasESIC: hasESIC || false,
        salaryConfig: salaryData || null
      }));
      setShowModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const isFormValid = (
    form.firstName && form.lastName && form.email && form.contact &&
    form.empId && form.biometricCode && form.joinDate && form.empCategory &&
    (!form.hasPF || (form.uan && form.pfMemberId)) &&
    (!form.hasESIC || form.esicIp)
  );

  const handleSave = () => {
    if (!isFormValid) {
      setErrorMsg('CRITICAL: All compulsory fields marked with * must be filled in all sections before onboarding.');
      showNotification('Validation Failed: Compulsory fields missing.', 'error');
      return;
    }
    
    const empData = {
      id: form.id,
      name: `${form.firstName} ${form.middleName ? form.middleName + ' ' : ''}${form.lastName}`.trim(),
      email: form.email,
      role: form.role || 'Associate',
      department: form.department || 'Engineering',
      status: 'Active',
      empType: form.probType,
      category: form.empCategory,
      joiningDate: form.joinDate,
      empCode: form.empId,
      biometricCode: form.biometricCode,
      contact: form.contact,
      presAddress: form.presAddress,
      permAddress: form.sameAsPresent ? form.presAddress : form.permAddress,
      uanNumber: form.hasPF ? form.uan : '',
      pfMemberId: form.hasPF ? form.pfMemberId : '',
      esicNumber: form.hasESIC ? form.esicIp : '',
      bloodGroup: form.bloodGroup,
      aadharNo: form.aadharNo,
      panNo: form.panNo,
      dlNo: form.dlNo,
      dlExpiry: form.dlExpiry,
      dlType: form.dlType,
      passportNo: form.passportNo,
      passportExpiry: form.passportExpiry,
      bankAccountName: form.bankAccountName,
      bankAccountNumber: form.bankAccountNumber,
      bankName: form.bankName,
      bankIfsc: form.bankIfsc,
      bankBranch: form.bankBranch,
      hasMediclaim: form.hasMediclaim,
      mediclaimPolicies: form.hasMediclaim ? form.mediclaimPolicies : [],
      hasTermInsurance: form.hasTermInsurance,
      termInsurancePolicies: form.hasTermInsurance ? form.termInsurancePolicies : []
    };

    const savedEmp = dataService.saveEmployee(empData);
    
    // Logic: If salaryConfig exists, save it linked to the (potentially new) emp ID
    if (form.salaryConfig) {
      dataService.saveSalaryStructure(savedEmp.id, {
        ...form.salaryConfig,
        empId: savedEmp.id,
        candidateName: savedEmp.name
      });
    }

    setEmployees(dataService.getEmployees());
    showNotification(`Employee ${form.id ? 'Updated' : 'Onboarded'} Successfully!`, 'success');
    setShowModal(false);
    resetForm();
  };

  const TabButton = ({ num, label, icon: Icon }) => (
    <button 
      style={{ padding: '1rem', flex: 1, backgroundColor: activeTab === num ? 'var(--color-surface)' : 'transparent', borderBottom: activeTab === num ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === num ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
      onClick={() => setActiveTab(num)}
    >
      <Icon size={18} /> {label}
    </button>
  );

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format) => {
    const rawData = employees.map(e => ({
      "Emp ID": e.empCode || `EMP-00${e.id}`, "Name": e.name, "Role": e.role, "Dept": e.department, "Status": e.status, "Gross": e.grossSalary || e.dayRate
    }));
    const worksheet = XLSX.utils.json_to_sheet(rawData);
    if (format === 'csv') {
      const blob = new Blob([XLSX.utils.sheet_to_csv(worksheet)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Employee_Directory.csv`; a.click();
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, worksheet, "Employees");
      XLSX.writeFile(wb, `Employee_Directory.xlsx`);
    }
  };

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">Manage and view all employee information.</p>
        </div>
        {!isEmployee && (
          <div style={{ display: 'flex', gap: '1rem' }} className="hide-on-print">
            <div style={{ position: 'relative' }}>
              <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                <Download size={16} style={{ marginRight: '0.5rem' }} /> Export Directory
              </button>
              {showExportMenu && (
                <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                  <button className="btn btn-ghost" onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} /> CSV Data</button>
                  <button className="btn btn-ghost" onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} /> Excel Workbook</button>
                  <button className="btn btn-ghost" onClick={() => { window.print(); setShowExportMenu(false) }}><Printer size={16} /> Print Directory</button>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Add Employee
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
          <div className="header-search" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <Search size={18} color="var(--color-text-muted)" />
            <input type="text" placeholder="Search by name, role or department" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn btn-outline">
            <Filter size={18} />
            Filter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Code</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Role</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Department</th>
                {isEmployee && <th style={{ padding: '1rem', fontWeight: '500' }}>Contact Number</th>}
                <th style={{ padding: '1rem', fontWeight: '500' }}>Status</th>
                {!isEmployee && <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => 
                e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (e.empCode && e.empCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.department.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background var(--transition-fast)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{emp.empCode}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-main)' }}>{emp.role}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{emp.department}</td>
                  {isEmployee && <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{emp.contact || '+91 98' + Math.floor(10000000 + Math.random() * 90000000)}</td>}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                      <span className={`badge ${emp.status === 'Active' ? 'badge-success' : emp.status === 'On Leave' ? 'badge-warning' : 'badge-danger'}`}>
                        {emp.status}
                      </span>
                      {emp.empType && (
                        <span className={`badge ${emp.empType === 'Probation' ? 'badge-primary' : emp.empType === 'Temporary' ? 'badge-warning' : 'badge-default'}`} style={{ opacity: 0.85, fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          {emp.empType}
                        </span>
                      )}
                    </div>
                  </td>
                  {!isEmployee && (
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setFeedbackConfig({ isOpen: true, empId: emp.id, type: 'Appraisal Review' })}
                        >
                          <MessageSquareShare size={12}/> Feedback
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem' }} onClick={() => handleEditEmployee(emp)}>
                          <FileText size={12} /> Profile
                        </button>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '0.5rem', color: 'var(--color-danger)', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.05)' }} 
                          onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                          title="Delete Employee"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '900px', padding: 0, maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--color-background)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Employee Onboarding Portal</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>Step-by-step registration matrix ensuring absolute data compliance.</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ fontSize: '1.5rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
              <TabButton num={1} label="Identity" icon={FileText} />
              <TabButton num={2} label="Employment" icon={Briefcase} />
              <TabButton num={3} label="Address" icon={MapPin} />
              <TabButton num={4} label="Compliance" icon={ShieldCheck} />
              <TabButton num={5} label="Vault" icon={UploadCloud} />
              <TabButton num={6} label="Compensation" icon={IndianRupee} />
              <TabButton num={7} label="Banking & Ins." icon={CreditCard} />
            </div>

            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
              
              {/* SECTION 1: Personal Identity */}
              {activeTab === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Basic Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">First Name *</label>
                        <input type="text" className="form-input" style={{width:'100%', borderColor: !form.firstName ? 'var(--color-danger)' : 'var(--color-border)'}} 
                          value={form.firstName} onChange={(e) => handleInput('firstName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Middle Name</label>
                        <input type="text" className="form-input" style={{width:'100%'}} 
                          value={form.middleName} onChange={(e) => handleInput('middleName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name *</label>
                        <input type="text" className="form-input" style={{width:'100%', borderColor: !form.lastName ? 'var(--color-danger)' : 'var(--color-border)'}} 
                          value={form.lastName} onChange={(e) => handleInput('lastName', e.target.value)} />
                      </div>
                      <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" className="form-input" style={{width:'100%'}} value={form.dob} onChange={e => handleInput('dob', e.target.value)} /></div>
                      <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select className="form-input" style={{width:'100%'}} value={form.gender} onChange={e => handleInput('gender', e.target.value)}>
                          <option>Select...</option><option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select className="form-input" style={{width:'100%'}} value={form.bloodGroup} onChange={e => handleInput('bloodGroup', e.target.value)}>
                          <option>Select...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Marital Status</label>
                        <select className="form-input" style={{width:'100%'}} value={form.marital} onChange={e => handleInput('marital', e.target.value)}>
                          <option>Select...</option><option>Single</option><option>Married</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Contact Number *</label>
                        <input type="tel" className="form-input" style={{width:'100%', borderColor: !form.contact ? 'var(--color-danger)' : 'var(--color-border)'}} 
                          value={form.contact} onChange={e => handleInput('contact', e.target.value)} />
                      </div>
                      <div className="form-group"><label className="form-label">Alternate Contact</label><input type="tel" className="form-input" style={{width:'100%'}} value={form.altContact} onChange={e => handleInput('altContact', e.target.value)} /></div>
                      <div className="form-group">
                        <label className="form-label">Personal Mail ID *</label>
                        <input type="email" className="form-input" style={{width:'100%', borderColor: !form.email ? 'var(--color-danger)' : 'var(--color-border)'}} 
                          value={form.email} onChange={e => handleInput('email', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Government ID Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">Aadhar Card No.</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.aadharNo} onChange={e => handleInput('aadharNo', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">PAN Card No.</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.panNo} onChange={e => handleInput('panNo', e.target.value)} />
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                        <div className="form-group">
                          <label className="form-label">Driving License No.</label>
                          <input type="text" className="form-input" style={{width:'100%'}} value={form.dlNo} onChange={e => handleInput('dlNo', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">DL Expiry Date</label>
                          <input type="date" className="form-input" style={{width:'100%'}} value={form.dlExpiry} onChange={e => handleInput('dlExpiry', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Type of License</label>
                          <select className="form-input" style={{width:'100%'}} value={form.dlType} onChange={e => handleInput('dlType', e.target.value)}>
                            <option value="">Select...</option>
                            <option value="2-Wheeler">2-Wheeler</option>
                            <option value="4-Wheeler">4-Wheeler</option>
                            <option value="Both">Both (2W & 4W)</option>
                            <option value="Commercial">Commercial</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Passport No.</label>
                          <input type="text" className="form-input" style={{width:'100%'}} value={form.passportNo} onChange={e => handleInput('passportNo', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Passport Expiry Date</label>
                          <input type="date" className="form-input" style={{width:'100%'}} value={form.passportExpiry} onChange={e => handleInput('passportExpiry', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: Employment */}
              {activeTab === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Employee Code * (Company Identity)</label>
                    <input type="text" className="form-input" placeholder="e.g. ABC-001" style={{width:'100%', borderColor: !form.empId ? 'var(--color-danger)' : 'var(--color-border)'}} 
                      value={form.empId} onChange={e => handleInput('empId', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Biometric Code *</label>
                    <input type="text" className="form-input" placeholder="e.g. 101" style={{width:'100%', borderColor: !form.biometricCode ? 'var(--color-danger)' : 'var(--color-border)'}} 
                      value={form.biometricCode} onChange={e => handleInput('biometricCode', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joining Date *</label>
                    <input type="date" className="form-input" style={{width:'100%', borderColor: !form.joinDate ? 'var(--color-danger)' : 'var(--color-border)'}} 
                      value={form.joinDate} onChange={e => handleInput('joinDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Category *</label>
                    <select className="form-input" style={{width:'100%', borderColor: !form.empCategory ? 'var(--color-danger)' : 'var(--color-border)'}} 
                      value={form.empCategory} onChange={(e) => handleInput('empCategory', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Staff Employee">Staff Employee</option>
                      <option value="On role worker">On role worker</option>
                      <option value="Contractual Worker">Contractual Worker</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select className="form-input" style={{width:'100%'}} value={form.department} onChange={e => handleInput('department', e.target.value)}>
                      <option value="">Select Department...</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Designation</label><input type="text" className="form-input" style={{width:'100%'}} value={form.role} onChange={e => handleInput('role', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Employment Status</label><select className="form-input" style={{width:'100%'}} value={form.probType} onChange={e => handleInput('probType', e.target.value)}><option>Select...</option><option>Temporary</option><option>Probation</option><option>Permanent</option></select></div>
                  <div className="form-group"><label className="form-label">Confirmation Date</label><input type="date" className="form-input" style={{width:'100%'}} value={form.exitDate} onChange={e => handleInput('exitDate', e.target.value)} disabled={form.probType === 'Probation'} /></div>
                  <div className="form-group"><label className="form-label">Probation Period</label><select className="form-input" style={{width:'100%'}} value={form.probPeriod} onChange={e => handleInput('probPeriod', e.target.value)} disabled={form.probType === 'Permanent'}><option>1 Month</option><option>2 Months</option><option>3 Months</option><option>4 Months</option><option>5 Months</option><option>6 Months</option></select></div>
                </div>
              )}

              {/* SECTION 3: Address */}
              {activeTab === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '600', color: 'var(--color-primary)' }}>Present Address</label>
                    <textarea rows="3" className="form-input" style={{width:'100%', resize: 'vertical'}} placeholder="Flat No, Street, City, State, PIN"
                      value={form.presAddress} onChange={e => handleInput('presAddress', e.target.value)}></textarea>
                  </div>
                  
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.sameAsPresent} onChange={(e) => handleInput('sameAsPresent', e.target.checked)} style={{ width: '16px', height: '16px' }} />
                      <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Permanent Address is exactly the same as Present Address</span>
                    </label>
                    
                    {!form.sameAsPresent && (
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '600' }}>Permanent Address</label>
                        <textarea rows="3" className="form-input" style={{width:'100%', resize: 'vertical'}} placeholder="Flat No, Street, City, State, PIN"
                          value={form.permAddress} onChange={e => handleInput('permAddress', e.target.value)}></textarea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 4: Compliance */}
              {activeTab === 4 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Statutory HR Logic Integration</h3>
                  
                  {errorMsg && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                      <AlertCircle size={20} />
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>{errorMsg}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: form.hasPF ? '1.5rem' : '0' }}>
                        <input type="checkbox" checked={form.hasPF} onChange={(e) => handleInput('hasPF', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }} />
                        <span style={{ fontWeight: '600', fontSize: '1rem' }}>Employee is Eligible for Provident Fund (PF)</span>
                      </label>
                      {form.hasPF && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingLeft: '2rem', borderLeft: '3px solid var(--color-primary)' }}>
                          <div className="form-group">
                            <label className="form-label">Universal Account Number (UAN) *</label>
                            <input type="text" className="form-input" value={form.uan} onChange={(e) => handleInput('uan', e.target.value)} style={{width:'100%', borderColor: !form.uan ? 'var(--color-danger)' : 'var(--color-border)'}} placeholder="Required 12-digit UAN" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">PF Member ID *</label>
                            <input type="text" className="form-input" value={form.pfMemberId} onChange={(e) => handleInput('pfMemberId', e.target.value)} style={{width:'100%', borderColor: !form.pfMemberId ? 'var(--color-danger)' : 'var(--color-border)'}} placeholder="Required Member ID" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: form.hasESIC ? '1.5rem' : '0' }}>
                        <input type="checkbox" checked={form.hasESIC} onChange={(e) => handleInput('hasESIC', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }} />
                        <span style={{ fontWeight: '600', fontSize: '1rem' }}>Employee is Eligible for State Insurance (ESIC)</span>
                      </label>
                      {form.hasESIC && (
                        <div style={{ paddingLeft: '2rem', borderLeft: '3px solid var(--color-warning)' }}>
                          <div className="form-group">
                            <label className="form-label">ESIC Member IP Number *</label>
                            <input type="text" className="form-input" value={form.esicIp} onChange={(e) => handleInput('esicIp', e.target.value)} style={{width:'100%', maxWidth: '300px', borderColor: !form.esicIp ? 'var(--color-danger)' : 'var(--color-border)'}} placeholder="Required Insurance IP" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: Documents */}
              {activeTab === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <label 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', border: '2px dashed var(--color-border)', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'var(--color-surface)', transition: 'border 0.2s ease' }} 
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'} 
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <UploadCloud size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Secure Document Vault</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', textAlign: 'center' }}>Upload Aadhar, PAN, Degrees, or Certifications.</p>
                    <span style={{ backgroundColor: 'var(--color-background)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid var(--color-border)' }}>MAX LIMIT: 2 MB EACH (Multiple Supported)</span>
                    <input type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>
                  
                  {uploadedFiles.length > 0 && (
                    <div style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>Attached Documents ({uploadedFiles.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {uploadedFiles.map((f, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: '4px', fontSize: '0.8rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>📄 {f.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                              <button 
                                type="button" 
                                className="btn btn-ghost" 
                                style={{ padding: '0.2rem', color: 'var(--color-danger)' }} 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFile(i); }}
                                title="Remove document"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: Compensation Structure */}
              {activeTab === 6 && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Remuneration Configuration</h3>
                  <div style={{ backgroundColor: 'var(--color-background)', borderRadius: '8px', padding: '1rem' }}>
                    <SalaryStructure 
                      isEmbedded={true} 
                      passedState={{
                        ...(form.salaryConfig || {}),
                        candidateName: form.firstName,
                        candidateMiddleName: form.middleName,
                        candidateLastName: form.lastName,
                        roleApplied: form.role
                      }} 
                      empCategory={form.empCategory} 
                      empId={form.id}
                      onStateChange={(salaryData) => setForm(prev => ({ ...prev, salaryConfig: salaryData }))}
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', gap: '1rem' }}>
                      <button className="btn btn-outline" onClick={() => showNotification(form.id ? 'Salary structure is active and validated.' : 'This is a structural preview. Final values will be committed upon saving the profile.', 'info')} style={{ gap: '0.5rem', fontSize: '0.8rem' }}>
                        <IndianRupee size={14} /> Validate Structure
                      </button>
                      {form.id && (
                        <button className="btn btn-primary" onClick={() => {
                          setShowModal(false);
                          navigate('/compensation', { 
                            state: { 
                              isAppraisal: true, 
                              employeeName: `${form.firstName} ${form.middleName ? form.middleName + ' ' : ''}${form.lastName}`.trim(), 
                              employeeRole: form.role, 
                              empId: form.id 
                            } 
                          });
                        }} style={{ gap: '0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--color-primary)' }}>
                          <TrendingUp size={14} /> Execute Appraisal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: Banking & Insurance */}
              {activeTab === 7 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  
                  {/* Bank Details */}
                  <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Bank Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">Account Holder Name</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.bankAccountName} onChange={e => handleInput('bankAccountName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.bankAccountNumber} onChange={e => handleInput('bankAccountNumber', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.bankName} onChange={e => handleInput('bankName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">IFSC Code</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.bankIfsc} onChange={e => handleInput('bankIfsc', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Branch Name</label>
                        <input type="text" className="form-input" style={{width:'100%'}} value={form.bankBranch} onChange={e => handleInput('bankBranch', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Mediclaim */}
                  <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: form.hasMediclaim ? '1.5rem' : '0' }}>
                      <input type="checkbox" checked={form.hasMediclaim} onChange={(e) => handleInput('hasMediclaim', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }} />
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>Employee has Mediclaim Policy</span>
                    </label>
                    {form.hasMediclaim && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {form.mediclaimPolicies.map((policy, index) => (
                          <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '1.5rem', paddingLeft: '2rem', borderLeft: '3px solid var(--color-primary)', alignItems: 'end' }}>
                            <div className="form-group">
                              <label className="form-label">Policy Number</label>
                              <input type="text" className="form-input" style={{width:'100%'}} value={policy.policyNo} onChange={e => handlePolicyChange('mediclaimPolicies', index, 'policyNo', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Policy Amount</label>
                              <input type="number" className="form-input" style={{width:'100%'}} value={policy.amount} onChange={e => handlePolicyChange('mediclaimPolicies', index, 'amount', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Policy Company</label>
                              <input type="text" className="form-input" style={{width:'100%'}} value={policy.company} onChange={e => handlePolicyChange('mediclaimPolicies', index, 'company', e.target.value)} />
                            </div>
                            {form.mediclaimPolicies.length > 1 && (
                              <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }} onClick={() => removePolicy('mediclaimPolicies', index)}>
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginLeft: '2rem', marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => addPolicy('mediclaimPolicies')}>
                          + Add Another Mediclaim Policy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Term Insurance */}
                  <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: form.hasTermInsurance ? '1.5rem' : '0' }}>
                      <input type="checkbox" checked={form.hasTermInsurance} onChange={(e) => handleInput('hasTermInsurance', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }} />
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>Employee has Term Insurance Policy</span>
                    </label>
                    {form.hasTermInsurance && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {form.termInsurancePolicies.map((policy, index) => (
                          <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '1.5rem', paddingLeft: '2rem', borderLeft: '3px solid var(--color-primary)', alignItems: 'end' }}>
                            <div className="form-group">
                              <label className="form-label">Policy Number</label>
                              <input type="text" className="form-input" style={{width:'100%'}} value={policy.policyNo} onChange={e => handlePolicyChange('termInsurancePolicies', index, 'policyNo', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Policy Amount</label>
                              <input type="number" className="form-input" style={{width:'100%'}} value={policy.amount} onChange={e => handlePolicyChange('termInsurancePolicies', index, 'amount', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Policy Company</label>
                              <input type="text" className="form-input" style={{width:'100%'}} value={policy.company} onChange={e => handlePolicyChange('termInsurancePolicies', index, 'company', e.target.value)} />
                            </div>
                            {form.termInsurancePolicies.length > 1 && (
                              <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }} onClick={() => removePolicy('termInsurancePolicies', index)}>
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginLeft: '2rem', marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => addPolicy('termInsurancePolicies')}>
                          + Add Another Term Insurance Policy
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={() => setActiveTab(Math.max(1, activeTab - 1))} disabled={activeTab === 1}>← Previous Block</button>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                {activeTab < 7 ? (
                  <button className="btn btn-primary" onClick={() => setActiveTab(activeTab + 1)}>Next Block →</button>
                ) : (
                  <button className="btn btn-primary" 
                    disabled={!isFormValid}
                    onClick={handleSave} 
                    style={{ 
                      backgroundColor: isFormValid ? 'var(--color-success)' : 'var(--color-text-muted)', 
                      borderColor: isFormValid ? 'var(--color-success)' : 'var(--color-border)',
                      cursor: isFormValid ? 'pointer' : 'not-allowed'
                    }}>
                    <Save size={16} /> Save & Complete Onboarding
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Persistence Layer Feedback Portal */}
      <FeedbackPortal 
        isOpen={feedbackConfig.isOpen}
        empId={feedbackConfig.empId}
        reviewType={feedbackConfig.type}
        onClose={() => setFeedbackConfig(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};

export default EmployeeDirectory;
