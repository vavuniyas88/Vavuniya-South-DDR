import {toPng} from 'html-to-image';
import {jsPDF} from 'jspdf';
import type {TranslationDictionary} from '../i18n/translations.ts';
import type {DutyEntry} from '../types.ts';
import {formatDuration, getDurationMinutes} from './time.ts';

interface ExportDutyPdfParams {
  duties: DutyEntry[];
  reportTitle: string;
  periodLabel: string;
  periodValue: string;
  officerLabel: string;
  designationLabel?: string;
  emptyMessage: string;
  t: TranslationDictionary;
  includeOfficerColumn: boolean;
  fileName: string;
}

interface ExportMonthlyPdfParams {
  duties: DutyEntry[];
  month: string;
  officerLabel: string;
  designationLabel?: string;
  t: TranslationDictionary;
  includeOfficerColumn: boolean;
  fileName: string;
}

interface ExportDailyPdfParams {
  duties: DutyEntry[];
  dateLabel: string;
  officerLabel: string;
  designationLabel?: string;
  t: TranslationDictionary;
  includeOfficerColumn: boolean;
  fileName: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function chunkDutiesIntoPages(duties: DutyEntry[], includeOfficerColumn: boolean): DutyEntry[][] {
  if (duties.length === 0) {
    return [[]];
  }
  const pages: DutyEntry[][] = [];
  // Estimate visual line weights per row so rows never overflow an A4 page
  const FIRST_PAGE_CAPACITY = 22;
  const NEXT_PAGE_CAPACITY = 27;

  let currentPage: DutyEntry[] = [];
  let currentWeight = 0;

  for (const duty of duties) {
    const descLen = duty.description.length + (duty.remarks ? duty.remarks.length + 12 : 0);
    const charsPerLine = includeOfficerColumn ? 34 : 48;
    const estLines = Math.max(1, Math.ceil(descLen / charsPerLine));
    const rowWeight = Math.min(6, estLines);

    const capacity = pages.length === 0 ? FIRST_PAGE_CAPACITY : NEXT_PAGE_CAPACITY;
    if (currentPage.length > 0 && currentWeight + rowWeight > capacity) {
      pages.push(currentPage);
      currentPage = [duty];
      currentWeight = rowWeight;
    } else {
      currentPage.push(duty);
      currentWeight += rowWeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

async function exportDutyPdf({
  duties,
  reportTitle,
  periodLabel,
  periodValue,
  officerLabel,
  designationLabel,
  emptyMessage,
  t,
  includeOfficerColumn,
  fileName,
}: ExportDutyPdfParams): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const ordered = [...duties].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  const totalMinutes = ordered.reduce(
    (sum, item) => sum + getDurationMinutes(item.startTime, item.endTime),
    0,
  );

  const pages = chunkDutiesIntoPages(ordered, includeOfficerColumn);
  const generatedDate = new Date().toLocaleDateString('en-CA');

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.backgroundColor = '#ffffff';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx += 1) {
      const pageRows = pages[pageIdx];
      const isFirstPage = pageIdx === 0;
      const isLastPage = pageIdx === pages.length - 1;

      const pageEl = document.createElement('div');
      pageEl.style.width = '794px';
      pageEl.style.minHeight = '1123px';
      pageEl.style.padding = '36px 40px';
      pageEl.style.backgroundColor = '#ffffff';
      pageEl.style.color = '#0f172a';
      pageEl.style.fontFamily =
        '"Plus Jakarta Sans", "Noto Sans Tamil", "Noto Sans Sinhala", sans-serif';
      pageEl.style.boxSizing = 'border-box';
      pageEl.style.display = 'flex';
      pageEl.style.flexDirection = 'column';
      pageEl.style.justifyContent = 'space-between';

      const rowsHtml = pageRows
        .map((duty, i) => {
          const globalIndex =
            pages
              .slice(0, pageIdx)
              .reduce((acc, p) => acc + p.length, 0) +
            i +
            1;
          const dur = formatDuration(
            getDurationMinutes(duty.startTime, duty.endTime),
            t,
          );
          const statusLabel = t.statuses[duty.status];
          const statusColor =
            duty.status === 'approved'
              ? '#15803d'
              : duty.status === 'submitted'
                ? '#b45309'
                : '#475569';
          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

          return `
            <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 6px; font-size: 11px; color: #475569; text-align: center; vertical-align: top;">${globalIndex}</td>
              <td style="padding: 8px 8px; font-size: 11px; color: #0f172a; white-space: nowrap; vertical-align: top; font-family: 'JetBrains Mono', monospace;">${escapeHtml(duty.date)}</td>
              ${
                includeOfficerColumn
                  ? `<td style="padding: 8px 8px; font-size: 11px; color: #0f172a; vertical-align: top;">
                      <div style="font-weight: 600;">${escapeHtml(duty.officerName || '')}</div>
                      <div style="font-size: 10px; color: #64748b;">${escapeHtml(duty.officerDesignation || '')}</div>
                    </td>`
                  : ''
              }
              <td style="padding: 8px 8px; font-size: 11px; color: #0f172a; white-space: nowrap; vertical-align: top; font-family: 'JetBrains Mono', monospace;">
                ${escapeHtml(duty.startTime)} - ${escapeHtml(duty.endTime)}
                <div style="font-size: 10px; color: #64748b; font-family: 'Plus Jakarta Sans', 'Noto Sans Tamil', 'Noto Sans Sinhala', sans-serif;">${escapeHtml(dur)}</div>
              </td>
              <td style="padding: 8px 8px; font-size: 11px; color: #0f172a; line-height: 1.45; vertical-align: top;">
                <div>${escapeHtml(duty.description)}</div>
                ${
                  duty.remarks
                    ? `<div style="margin-top: 3px; font-size: 10px; color: #64748b;">${escapeHtml(t.common.remarks)}: ${escapeHtml(duty.remarks)}</div>`
                    : ''
                }
              </td>
              <td style="padding: 8px 6px; font-size: 10.5px; font-weight: 600; color: ${statusColor}; white-space: nowrap; vertical-align: top;">
                ${escapeHtml(statusLabel)}
              </td>
            </tr>
          `;
        })
        .join('');

      pageEl.innerHTML = `
        <div>
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px;">
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; text-align: center;">
              ${escapeHtml(t.header.secretariat)}
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #0f766e; text-align: center; margin-top: 3px;">
              ${escapeHtml(t.header.division)} · ${escapeHtml(reportTitle)}
            </div>
          </div>

          ${
            isFirstPage
              ? `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; font-size: 11.5px;">
              <div>
                <div style="margin-bottom: 4px;"><strong style="color: #334155;">${escapeHtml(t.pdf.officerDetails)}:</strong> ${escapeHtml(officerLabel)}${designationLabel ? ` (${escapeHtml(designationLabel)})` : ''}</div>
                <div><strong style="color: #334155;">${escapeHtml(periodLabel)}:</strong> <span style="font-family: 'JetBrains Mono', monospace;">${escapeHtml(periodValue)}</span></div>
              </div>
              <div style="text-align: right;">
                <div style="margin-bottom: 4px;"><strong style="color: #334155;">${escapeHtml(t.common.totalDuties)}:</strong> ${ordered.length}</div>
                <div><strong style="color: #334155;">${escapeHtml(t.common.totalHours)}:</strong> ${escapeHtml(formatDuration(totalMinutes, t))}</div>
              </div>
            </div>
          `
              : ''
          }

          ${
            ordered.length === 0
              ? `<div style="padding: 36px; text-align: center; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px;">${escapeHtml(emptyMessage)}</div>`
              : `
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
              <thead>
                <tr style="background-color: #0f172a; color: #ffffff;">
                  <th style="padding: 8px 6px; font-size: 10.5px; text-align: center; width: 32px;">#</th>
                  <th style="padding: 8px 8px; font-size: 10.5px; text-align: left; width: 88px;">${escapeHtml(t.common.date)}</th>
                  ${
                    includeOfficerColumn
                      ? `<th style="padding: 8px 8px; font-size: 10.5px; text-align: left; width: 130px;">${escapeHtml(t.common.officer)}</th>`
                      : ''
                  }
                  <th style="padding: 8px 8px; font-size: 10.5px; text-align: left; width: 104px;">${escapeHtml(t.common.startTime)} - ${escapeHtml(t.common.endTime)}</th>
                  <th style="padding: 8px 8px; font-size: 10.5px; text-align: left;">${escapeHtml(t.common.dutyDetails)}</th>
                  <th style="padding: 8px 6px; font-size: 10.5px; text-align: left; width: 88px;">${escapeHtml(t.common.status)}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          `
          }
        </div>

        <div style="margin-top: 24px;">
          ${
            isLastPage
              ? `
            <div style="display: flex; justify-content: space-between; margin-top: 32px; margin-bottom: 22px; padding: 0 12px;">
              <div style="width: 220px; border-top: 1px solid #64748b; padding-top: 6px; font-size: 11px; color: #334155; text-align: center;">
                ${escapeHtml(t.pdf.signatureOfficer)}
              </div>
              <div style="width: 240px; border-top: 1px solid #64748b; padding-top: 6px; font-size: 11px; color: #334155; text-align: center;">
                ${escapeHtml(t.pdf.signatureAdmin)}
              </div>
            </div>
          `
              : ''
          }
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: #64748b;">
            <span>${escapeHtml(t.header.secretariat)} · ${escapeHtml(t.header.division)}</span>
            <span>${escapeHtml(t.pdf.generatedOn)}: ${escapeHtml(generatedDate)} · ${escapeHtml(t.pdf.pageLabel)} ${pageIdx + 1}/${pages.length}</span>
          </div>
        </div>
      `;

      host.innerHTML = '';
      host.appendChild(pageEl);

      // Allow browser layout & font paint
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 40)));

      const pngDataUrl = await toPng(pageEl, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      if (pageIdx > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(fileName);
  } finally {
    host.remove();
  }
}

export async function exportMonthlyDutyPdf({
  duties,
  month,
  officerLabel,
  designationLabel,
  t,
  includeOfficerColumn,
  fileName,
}: ExportMonthlyPdfParams): Promise<void> {
  return exportDutyPdf({
    duties,
    reportTitle: t.pdf.reportTitle,
    periodLabel: t.pdf.reportPeriod,
    periodValue: month,
    officerLabel,
    designationLabel,
    emptyMessage: t.common.noDutiesForMonth,
    t,
    includeOfficerColumn,
    fileName,
  });
}

export async function exportDailyDutyPdf({
  duties,
  dateLabel,
  officerLabel,
  designationLabel,
  t,
  includeOfficerColumn,
  fileName,
}: ExportDailyPdfParams): Promise<void> {
  return exportDutyPdf({
    duties,
    reportTitle: t.pdf.dailyReportTitle,
    periodLabel: t.common.date,
    periodValue: dateLabel,
    officerLabel,
    designationLabel,
    emptyMessage: t.common.noDutiesForDate,
    t,
    includeOfficerColumn,
    fileName,
  });
}
