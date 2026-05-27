import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FileText, Download, Users, User, IndianRupee, Printer, Search, FileSpreadsheet, FileSignature, Receipt, Briefcase, Stamp } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { generatePDF } from '../utils/exportUtils';

const PTReport = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [dbRecords, setDbRecords] = useState({});
    const [loading, setLoading] = useState(true);
    
    // Config placeholders (could be fetched from a config service in the future)
    const [companyConfig, setCompanyConfig] = useState({
        name: 'Accuweigh Automation & Solutions Pvt. Ltd.',
        address: 'Shed. No. 2, Sr. No. 23/3/1, Wadekar Industrial Estate, Behind Abhinav Pharma College, Mauje - Narhe, Pune-411041.',
        ptRegNumber: 'PTR-27AABCD1234E1Z5'
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [emps, dbRecs] = await Promise.all([
                    dataService.getEmployees().catch(() => []),
                    dataService.getPayrollRecordsByMonth(month, year).catch(() => [])
                ]);
                
                const dbRecsMap = {};
                dbRecs.forEach(r => {
                    if (r && r.empId && r.payrollGenerated && r.payrollContext) {
                        dbRecsMap[String(r.empId)] = r;
                    }
                });
                
                setEmployees(emps);
                setDbRecords(dbRecsMap);
            } catch (err) {
                console.error("Failed to load PT report data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [month, year]);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const reportData = useMemo(() => {
        const processed = [];
        
        employees.forEach(emp => {
            const dbRec = dbRecords[String(emp.id)];
            if (!dbRec) return; // Only process those with generated payroll this month
            
            const ptDeducted = dbRec.payrollContext.deductions?.pt || 0;
            
            // Per requirements: Exclude employees with zero PT if required (we will exclude them for the official challan)
            if (ptDeducted <= 0) return;

            const gross = dbRec.payrollContext.earnings?.gross || 0;

            processed.push({
                id: emp.id,
                empCode: emp.empCode || emp.id,
                name: emp.name,
                grossWages: gross,
                ptAmount: ptDeducted
            });
        });
        
        return processed.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            String(item.empCode).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [year, month, employees, searchTerm, dbRecords]);

    const totalPT = useMemo(() => {
        return reportData.reduce((acc, curr) => acc + curr.ptAmount, 0);
    }, [reportData]);

    const handleExport = (format) => {
        const rawData = reportData.map((d, index) => ({
            "S.No.": index + 1,
            "Employee ID": d.empCode,
            "Employee Name": d.name,
            "Gross Salary": d.grossWages,
            "PT Deducted": d.ptAmount
        }));

        // Add Total Row
        rawData.push({
            "S.No.": "",
            "Employee ID": "",
            "Employee Name": "TOTAL",
            "Gross Salary": "",
            "PT Deducted": totalPT
        });

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `PT_Return_Challan_${monthNames[month]}_${year}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "PT_Return");
            XLSX.writeFile(workbook, `PT_Return_Challan_${monthNames[month]}_${year}.xlsx`);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header hide-on-print">
                <div>
                    <h1 className="page-title">Professional Tax (PT) Report</h1>
                    <p className="page-subtitle">Auto-generated PT Return Challan from Payroll data.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                     <div style={{ position: 'relative' }}>
                          <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                               <Download size={16} style={{ marginRight: '0.5rem' }} /> Export Challan
                          </button>
                          {showExportMenu && (
                              <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} style={{ marginRight: '0.5rem' }} /> CSV Data</button>
                                    <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} style={{ marginRight: '0.5rem' }} /> Download Excel (.xlsx)</button>
                                    <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('pt-challan-capture', `PT_Challan_${monthNames[month]}_${year}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            <div className="card hide-on-print" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <label className="form-label">Select Month / Year</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <select className="form-input" style={{ flex: 1 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select className="form-input" style={{ width: '100px' }} value={year} onChange={e => setYear(Number(e.target.value))}>
                                <option>2024</option>
                                <option>2025</option>
                                <option>2026</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Quick Search (Employees)</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search by name or ID..." 
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Printable Challan Area */}
            <div id="pt-challan-capture" style={{ backgroundColor: '#fff', color: '#000', padding: '3rem', minHeight: '800px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                {/* Government Style Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Professional Tax Return Challan</h1>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>Form III-B (See Rule 11)</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Return of Tax Payable by Employer under sub-section (1) of Section 6</p>
                </div>

                {/* Company & Challan Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                    <div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ display: 'inline-block', width: '150px' }}>Name of Employer:</strong> 
                            <span>{companyConfig.name}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem', display: 'flex' }}>
                            <strong style={{ display: 'inline-block', width: '150px', flexShrink: 0 }}>Address:</strong> 
                            <span>{companyConfig.address}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ display: 'inline-block', width: '150px' }}>PT Registration No:</strong> 
                            <span style={{ fontWeight: 'bold' }}>{companyConfig.ptRegNumber}</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ display: 'inline-block', width: '150px' }}>Return Period:</strong> 
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{monthNames[month]} {year}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ display: 'inline-block', width: '150px' }}>Total Employees:</strong> 
                            <span>{reportData.length}</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ display: 'inline-block', width: '150px' }}>Generation Date:</strong> 
                            <span>{new Date().toLocaleDateString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Tax Summary Widget */}
                <div style={{ border: '1px solid #000', padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Receipt size={32} opacity={0.5} />
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', color: '#666' }}>Total Tax Payable</div>
                            <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{totalPT.toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', color: '#666' }}>Status</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>Auto-Calculated</div>
                    </div>
                </div>

                {/* Employee PT Breakup Table */}
                <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Employee PT Breakup</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '3rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #000' }}>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>S.No.</th>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>Employee ID</th>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>Employee Name</th>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textAlign: 'right' }}>Gross Salary (₹)</th>
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textAlign: 'right' }}>PT Deducted (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((item, idx) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '0.75rem 0.5rem' }}>{idx + 1}</td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>{item.empCode}</td>
                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{item.name}</td>
                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{item.grossWages.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600' }}>{item.ptAmount.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', fontStyle: 'italic', color: '#666' }}>
                                    No PT deductions found for the selected period.
                                </td>
                            </tr>
                        )}
                        <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f9f9f9' }}>
                            <td colSpan="4" style={{ padding: '1rem 0.5rem', fontWeight: 'bold', textAlign: 'right' }}>GRAND TOTAL</td>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>₹{totalPT.toLocaleString('en-IN')}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Declaration & Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px dashed #ccc' }}>
                    <div style={{ flex: 1, paddingRight: '2rem' }}>
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                            <strong>Declaration:</strong> I certify that the information given in this return is correct and complete, and that the amount of tax payable for the month has been correctly deducted from the salaries/wages of the employees as per the State Professional Tax Act.
                        </p>
                    </div>
                    <div style={{ width: '300px', textAlign: 'center' }}>
                        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                            <Stamp size={64} />
                        </div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
                            <strong>Authorized Signatory / Seal</strong>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>{companyConfig.name}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PTReport;
