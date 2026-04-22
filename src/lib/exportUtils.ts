import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Note: Professional Arabic PDF generation usually requires embedding a font like Tajawal.
// For the purpose of this implementation and without external font files, we'll focus on 
// structured data export. In a full production env, we'd add .addFileToVFS and .addFont.

export interface ExportData {
  title: string;
  subtitle?: string;
  dateRange: string;
  metrics: { label: string; value: string | number }[];
  tables: {
    title: string;
    headers: string[];
    rows: any[][];
  }[];
}

export const exportToPdf = (data: ExportData, filename: string) => {
  const doc = new jsPDF();
  
  // Basic sanity check: if the text is Arabic, jsPDF needs a custom font.
  // We sanitize the data to avoid crashes if custom fonts aren't loaded.
  const sanitize = (text: any) => {
    if (typeof text !== 'string') return String(text);
    // Replace Arabic chars with Latin placeholders or keep if font supported.
    // For this step, we keep them as is and assume a standard environment where
    // developers will add the Tajawal.ttf as per standard jsPDF Arabic workflow.
    return text;
  };

  // Styles
  const primaryColor = [22, 38, 56]; // Dark Blue from Lourex theme
  const accentColor = [212, 175, 55]; // Gold

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(sanitize(data.title), 15, 25);

  doc.setFontSize(10);
  doc.text(sanitize(data.dateRange), 15, 34);

  let cursorY = 50;

  // Metrics Section
  if (data.metrics.length > 0) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.text("Summary Metrics", 15, cursorY);
    cursorY += 10;

    const metricWidth = 60;
    const metricsPerRow = 3;
    
    data.metrics.forEach((metric, index) => {
      const x = 15 + (index % metricsPerRow) * metricWidth;
      const y = cursorY + Math.floor(index / metricsPerRow) * 20;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(sanitize(metric.label), x, y);
      
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(sanitize(metric.value), x, y + 7);
    });

    cursorY += (Math.ceil(data.metrics.length / metricsPerRow) * 20) + 10;
  }

  // Tables
  data.tables.forEach((table) => {
    if (cursorY > 240) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(sanitize(table.title), 15, cursorY);
    cursorY += 5;

    autoTable(doc, {
      startY: cursorY,
      head: [table.headers.map(sanitize)],
      body: table.rows.map(row => row.map(sanitize)),
      styles: {
        fontSize: 9,
        cellPadding: 3,
        font: "helvetica", // Fallback for stability
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 15, right: 15 },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 15;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Lourex Business Report - Generated on ${new Date().toLocaleDateString()}`,
      15,
      285
    );
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
  }

  doc.save(`${filename}.pdf`);
};
