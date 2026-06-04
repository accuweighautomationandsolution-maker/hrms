import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Capture a DOM element and save it as a PDF
 */
export const generatePDF = async (elementId, fileName, title = '') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

/**
 * Generate a professional Board Report (Mock high-level data)
 */
export const generateBoardReport = async (companyData) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const w = pdf.internal.pageSize.getWidth();
  
  // Header
  pdf.setFillColor(37, 99, 235); // var(--color-primary)
  pdf.rect(0, 0, w, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.text('EXECUTIVE BOARD REPORT', 15, 20);
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30);
  
  // Content Sections
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(16);
  pdf.text('1. Workforce Overview', 15, 55);
  pdf.line(15, 58, 60, 58);
  
  pdf.setFontSize(11);
  pdf.text(`Total Headcount: ${companyData.totalEmployees || 124}`, 15, 68);
  pdf.text(`Active Attendance Rate: ${companyData.attendanceRate || '94%'}`, 15, 75);
  pdf.text(`On-time Performance: ${companyData.onTimeRate || '88.5%'}`, 15, 82);
  
  pdf.setFontSize(16);
  pdf.text('2. Financial Implications (Advances & Expenses)', 15, 100);
  pdf.line(15, 103, 110, 103);
  
  pdf.setFontSize(11);
  pdf.text(`Monthly Advance Outlay: INR ${companyData.totalAdvances || '2,45,000'}`, 15, 113);
  pdf.text(`Pending Expense Approvals: INR ${companyData.totalExpenses || '82,400'}`, 15, 120);
  
  pdf.setFontSize(16);
  pdf.text('3. Strategic Goals & Training', 15, 140);
  pdf.line(15, 143, 85, 143);
  
  pdf.setFontSize(11);
  pdf.text(`Training Completion: ${companyData.trainingProgress || '76%'}`, 15, 153);
  pdf.text(`Critical Statutory Compliance: 100% (Certified)`, 15, 160);
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Accuweigh HRMS - Confidential Statistical Analysis', w / 2, 285, { align: 'center' });
  
  pdf.save(`Board_Report_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
};

/**
 * Generate and download an Excel file from JSON data
 */
export const generateExcel = (data, fileName, sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Mock Email Dispatching
 */
export const dispatchMockEmail = async (details) => {
  const { to, subject, body, attachmentName } = details;
  
  return new Promise((resolve) => {
    console.log(`[MOCK EMAIL] Sending to: ${to}`);
    console.log(`[MOCK EMAIL] Subject: ${subject}`);
    console.log(`[MOCK EMAIL] Attachment: ${attachmentName || 'None'}`);
    
    // Simulate network delay
    setTimeout(() => {
      resolve({
        success: true,
        message: `Report successfully dispatched to ${to}`
      });
    }, 1500);
  });
};
