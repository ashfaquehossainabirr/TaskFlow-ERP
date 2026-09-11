const PDFDocument = require('pdfkit');

const INK = '#1a2028';
const MUTED = '#6b7280';
const LINE = '#e2e5ea';
const ACCENT = '#0e7c86';

function money(value) {
  return `$${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function bdt(value) {
  return `Tk ${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function newDocument() {
  return new PDFDocument({ size: 'A4', margin: 50 });
}

function streamPdf(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
}

// Brand header row shared by every document type.
function drawBrandHeader(doc, docType, docSubtitle) {
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(18).text('TaskFlow ERP', 50, 50);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Developed by Ashfaque Hossain Abir', 50, 72);

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(docType, 0, 50, { align: 'right' });
  if (docSubtitle) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(docSubtitle, 0, 74, { align: 'right' });
  }

  doc
    .moveTo(50, 100)
    .lineTo(545, 100)
    .strokeColor(LINE)
    .lineWidth(1)
    .stroke();
  doc.moveDown();
  doc.y = 114;
}

function labelValue(doc, x, y, label, value, opts = {}) {
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(label.toUpperCase(), x, y, { characterSpacing: 0.4 });
  doc
    .fillColor(INK)
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || 11)
    .text(value || '—', x, y + 12, { width: opts.width || 240 });
}

function drawTableHeader(doc, x, y, columns) {
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5);
  columns.forEach((col) => {
    doc.text(col.label.toUpperCase(), x + col.x, y, { width: col.width, align: col.align || 'left', characterSpacing: 0.3 });
  });
  doc
    .moveTo(x, y + 16)
    .lineTo(x + columns.reduce((sum, c) => Math.max(sum, c.x + c.width), 0), y + 16)
    .strokeColor(LINE)
    .lineWidth(1)
    .stroke();
}

function drawTableRow(doc, x, y, columns, values, opts = {}) {
  doc.fillColor(opts.color || INK).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10.5);
  columns.forEach((col, i) => {
    doc.text(String(values[i] ?? ''), x + col.x, y, { width: col.width, align: col.align || 'left' });
  });
}

module.exports = {
  newDocument,
  streamPdf,
  drawBrandHeader,
  labelValue,
  drawTableHeader,
  drawTableRow,
  money,
  bdt,
  INK,
  MUTED,
  LINE,
  ACCENT,
};
