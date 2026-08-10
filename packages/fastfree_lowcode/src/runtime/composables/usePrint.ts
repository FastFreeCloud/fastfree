import { useNotify } from './useNotify'
import { useLcI18n } from '../i18n'
import { useLcI18nStore } from './useLcI18nStore'

export interface PrintCompany {
  name: string
  logo?: string
  taxNumber?: string
  phone?: string
  commercialRegister?: string
  address?: string
}

export interface PrintColumn {
  name: string
  label: string
  field: string | ((row: Record<string, unknown>) => unknown)
  align?: 'left' | 'center' | 'right'
  format?: (val: unknown, row: Record<string, unknown>) => string
}

export interface PrintTableOptions {
  title: string
  company?: PrintCompany
  columns: PrintColumn[]
  rows: Record<string, unknown>[]
  total?: { label: string; value: number | string }
  orientation?: 'portrait' | 'landscape'
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function getCellValue(row: Record<string, unknown>, col: PrintColumn): string {
  const val = typeof col.field === 'function' ? col.field(row) : row[col.field]
  if (val === null || val === undefined) return '-'
  if (col.format) return col.format(val, row)
  return String(val)
}

export function usePrint() {
  const notify = useNotify()
  const { t } = useLcI18n()
  const i18nStore = useLcI18nStore()
  const locale = i18nStore.locale.value === 'ar' ? 'ar-EG' : 'en-US'

  function printHtml(html: string) {
    const printWindow = window.open('', '_blank', 'noopener')
    if (!printWindow) {
      notify.error(t('print.printWindowFailed'))
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 800)
  }

  function printTable(options: PrintTableOptions) {
    const { title, company, columns, rows, total, orientation = 'landscape' } = options
    const now = new Date()
    const printDate = now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' })
    const printTime = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true, numberingSystem: 'latn' })

    const metaLine = [
      company?.taxNumber ? `${t('print.taxNumber')}: ${company.taxNumber}` : '',
      company?.phone ? `${t('print.phone')}: ${company.phone}` : '',
      company?.commercialRegister ? `${t('print.commercialRegister')}: ${company.commercialRegister}` : '',
      company?.address || '',
    ].filter(Boolean).join(' | ')

    const headerCells = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')
    const bodyRows = rows.map((row, i) => {
      const cells = columns.map((c, j) => {
        const align = j === 0 ? 'center' : (c.align === 'right' ? 'right' : c.align === 'left' ? 'left' : 'center')
        return `<td style="text-align:${align}">${escapeHtml(getCellValue(row, c))}</td>`
      }).join('')
      return `<tr><td>${i + 1}</td>${cells}</tr>`
    }).join('')

    const totalRow = total ? `
      <tr style="background-color:#e3f2fd !important;font-weight:700;font-size:14px;">
        <td colspan="${columns.length}" style="border-top:3px solid #0D47A1;text-align:center;">${escapeHtml(total.label)}</td>
        <td style="border-top:3px solid #0D47A1;text-align:center;font-weight:700;color:#0D47A1;">${total.value}</td>
      </tr>` : ''

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
    <style>
      *{font-family:'Cairo Variable','Cairo','Arial',sans-serif;margin:0;padding:0;box-sizing:border-box}
      body{padding:25px;direction:rtl}
      .header{text-align:center;margin-bottom:20px;border-bottom:3px solid #0D47A1;padding-bottom:15px}
      .header h1{font-size:26px;font-weight:700;color:#0D47A1;margin-bottom:5px}
      .header .meta-line{font-size:12px;color:#888;margin-top:4px}
      .title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding:10px 15px;background-color:#f0f4f8;border-radius:8px}
      .title-row .report-title{font-size:18px;font-weight:700;color:#333}
      .title-row .report-meta{font-size:13px;color:#666;text-align:left}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
      th,td{border:1px solid #333;padding:10px 8px;text-align:center}
      th{background-color:#0D47A1;color:white;font-weight:700;font-size:13px}
      tr:nth-child(even){background-color:#f8f9fa}
      tr:hover{background-color:#e3f2fd}
      .footer{margin-top:20px;padding-top:10px;border-top:2px solid #ddd;display:flex;justify-content:space-between;font-size:11px;color:#888}
      @media print{body{padding:15px}@page{margin:1cm;size:${orientation}}table{font-size:11px}th,td{padding:6px 5px}tr:hover{background-color:inherit !important}}
    </style></head><body>
      <div class="header">
        ${company?.logo ? `<img src="${escapeHtml(company.logo)}" alt="Logo" style="max-width:120px;max-height:80px;margin-bottom:10px;" onerror="this.style.display='none'" />` : ''}
        <h1>${escapeHtml(company?.name || 'FastFree')}</h1>
        ${metaLine ? `<div class="meta-line">${escapeHtml(metaLine)}</div>` : ''}
      </div>
      <div class="title-row">
        <div class="report-title">${escapeHtml(title)}</div>
        <div class="report-meta">${t('print.printDate')}: ${printDate} - ${printTime}<br>${t('export.recordCount')}: ${rows.length}</div>
      </div>
      <table><thead><tr><th>${t('export.serialNo')}</th>${headerCells}</tr></thead><tbody>${bodyRows}${totalRow}</tbody></table>
      <div class="footer"><span>${escapeHtml(company?.name || '')}</span><span>FastFree</span></div>
    </body></html>`

    printHtml(html)
  }

  return { printHtml, printTable }
}
