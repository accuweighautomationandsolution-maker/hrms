import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Building2, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  Plus,
  Save,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Mail,
  X
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

const BudgetControl = () => {
    const [budgets, setBudgets] = useState(dataService.getDeptBudgets());
    const [isEditing, setIsEditing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    
    
    // Calculate live utilization mapping
    const metrics = useMemo(() => {
        let totalCompanyBudget = 0;
        let totalCompanyUtilized = 0;
        let deptsOverBudget = 0;

        const enrichedBudgets = budgets.map(b => {
            const utilized = dataService.getBudgetUtilization(b.department);
            const percentage = b.totalBudget > 0 ? (utilized / b.totalBudget) * 100 : 0;
            
            totalCompanyBudget += b.totalBudget;
            totalCompanyUtilized += utilized;
            if (percentage > 100 + Number(b.buffer)) {
                deptsOverBudget++;
            }

            return {
                ...b,
                utilized,
                available: Math.max(0, b.totalBudget - utilized),
                percentage: percentage.toFixed(1),
                status: percentage <= 70 ? 'green' : percentage <= 90 ? 'yellow' : 'red'
            };
        });

        return {
            enrichedBudgets,
            totalCompanyBudget,
            totalCompanyUtilized,
            deptsOverBudget
        };
    }, [budgets]);

    const handleBudgetChange = (idx, field, val) => {
        const copy = [...budgets];
        if (field === 'totalBudget' || field === 'buffer') {
            copy[idx][field] = Number(val);
        } else {
            copy[idx][field] = val;
        }
        setBudgets(copy);
    };

    const handleDeleteDepartment = (idx) => {
        const copy = [...budgets];
        copy.splice(idx, 1);
        setBudgets(copy);
    };

    const handleSave = () => {
        dataService.saveDeptBudgets(budgets);
        setIsEditing(false);
        alert('Budget parameters successfully updated.');
    };

    const handleExport = (format) => {
        const rawData = metrics.enrichedBudgets.map(b => ({
            "Department Name": b.department,
            "Financial Category": b.type,
            "Total Allocated Limit": b.totalBudget,
            "Buffer %": b.buffer,
            "Used Volume": b.utilized,
            "Available Space": b.available,
            "Burn Rate": b.percentage + '%'
        }));

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Budget_Control_Report.csv`;
            a.click();
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "BudgetReport");
            XLSX.writeFile(workbook, `Budget_Control_Report.xlsx`);
        }
    };


    const addNewDepartment = () => {
        const newDept = {
            id: Date.now(),
            department: 'New Department',
            year: new Date().getFullYear().toString(),
            totalBudget: 1000000,
            type: 'Annual',
            buffer: 5
        };
        setBudgets([...budgets, newDept]);
        setIsEditing(true);
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Department Budget Control</h1>
                    <p className="page-subtitle">Define and monitor financial envelopes for HR headcount strictly.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }} className="hide-on-print">
                     <div style={{ position: 'relative' }}>
                          <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                               <Download size={16} style={{ marginRight: '0.5rem' }} /> Export & Share
                          </button>
                          {showExportMenu && (
                              <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} style={{ marginRight: '0.5rem' }} /> CSV Data</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} style={{ marginRight: '0.5rem' }} /> Excel Workbook</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { window.print(); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Print / PDF</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                              </div>
                          )}
                     </div>
                    {isEditing ? (
                        <button className="btn btn-success" onClick={handleSave}>
                            <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Matrix
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                            Update Budgets
                        </button>
                    )}
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Company Global Headcount Budget</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(metrics.totalCompanyBudget)}</div>
                        </div>
                        <Building2 size={32} color="var(--color-primary)" opacity={0.2} />
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Total Utilization (Live Employee Set)</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>{formatCurrency(metrics.totalCompanyUtilized)}</div>
                        </div>
                        <TrendingUp size={32} color="var(--color-warning)" opacity={0.3} />
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Departments Over-Budget</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: metrics.deptsOverBudget > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                {metrics.deptsOverBudget}
                            </div>
                        </div>
                        {metrics.deptsOverBudget > 0 ? <AlertTriangle size={32} color="var(--color-danger)" opacity={0.4} /> : <TrendingDown size={32} color="var(--color-success)" opacity={0.4} />}
                    </div>
                </div>
            </div>

            {/* Breakdown Visualizer */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Utilization Matrix</h3>
                <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.enrichedBudgets} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" tickFormatter={(v) => `₹${v/100000}L`} />
                            <YAxis dataKey="department" type="category" width={100} fontSize={12} />
                            <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                            <Legend />
                            <Bar dataKey="utilized" name="Utilized Amount" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                            <Bar dataKey="available" name="Available Space" stackId="a" fill="#e2e8f0" radius={[0,4,4,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Editor Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Envelope Configuration Matrix</h3>
                    {isEditing && (
                        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} onClick={addNewDepartment}>
                            <Plus size={16} /> Add Dept Node
                        </button>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '1rem' }}>Department Name</th>
                                <th style={{ padding: '1rem' }}>Financial Category</th>
                                <th style={{ padding: '1rem' }}>Total Allocated Limit</th>
                                <th style={{ padding: '1rem' }}>Buffer (%)</th>
                                <th style={{ padding: '1rem' }}>Used Volume</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Burn Rate</th>
                                {isEditing && <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.enrichedBudgets.map((dept, idx) => (
                                <tr key={dept.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        {isEditing ? (
                                            <input type="text" className="form-input" value={dept.department} onChange={(e) => handleBudgetChange(idx, 'department', e.target.value)} />
                                        ) : (
                                            <span style={{ fontWeight: '600' }}>{dept.department}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {isEditing ? (
                                            <select className="form-input" value={dept.type} onChange={(e) => handleBudgetChange(idx, 'type', e.target.value)}>
                                                <option value="Annual">Annual Basis</option>
                                                <option value="Monthly">Monthly Roll</option>
                                            </select>
                                        ) : (
                                            <span>{dept.type} / {dept.year}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {isEditing ? (
                                            <input type="number" className="form-input" value={dept.totalBudget} onChange={(e) => handleBudgetChange(idx, 'totalBudget', e.target.value)} />
                                        ) : (
                                            <span style={{ fontWeight: '700' }}>{formatCurrency(dept.totalBudget)}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {isEditing ? (
                                            <input type="number" className="form-input" style={{ width: '70px' }} value={dept.buffer} onChange={(e) => handleBudgetChange(idx, 'buffer', e.target.value)} />
                                        ) : (
                                            <span>+{dept.buffer}%</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {formatCurrency(dept.utilized)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: '600', color: dept.status === 'red' ? 'var(--color-danger)' : dept.status === 'yellow' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                                {dept.percentage}% 
                                            </span>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dept.status === 'red' ? 'var(--color-danger)' : dept.status === 'yellow' ? 'var(--color-warning)' : 'var(--color-success)' }}></div>
                                        </div>
                                    </td>
                                    {isEditing && (
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button className="btn btn-ghost" style={{ color: 'var(--color-danger)', padding: '0.25rem' }} onClick={() => handleDeleteDepartment(idx)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showEmailModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email Budget Report</h2>
                            <button onClick={() => setShowEmailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Recipient Addresses (comma separated)</label>
                            <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem' }} placeholder="directors@company.com" />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Attached Formats</label>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} /> PDF Report System</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} /> Excel (.xlsx)</label>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Brief Message Text</label>
                            <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the latest departmental budget utilization report. Note: ${metrics.deptsOverBudget} departments are currently flagged as over budget limit.`}></textarea>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={() => { alert('Report successfully queued for email automation!'); setShowEmailModal(false); }}>
                            Dispatch Email
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetControl;
