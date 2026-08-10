import { exportFile } from 'quasar'
import { useNotify } from './useNotify'
import { useLcI18n } from '../i18n'
import { useLcI18nStore } from './useLcI18nStore'

export interface ExcelCompany {
  name: string
  taxNumber?: string
  phone?: string
  commercialRegister?: string
  address?: string
}

export interface ExcelColumn {
  name: string
  label: string
  field: string | ((row: Record<string, unknown>) => unknown)
  format?: (val: unknown, row: Record<string, unknown>) => string
  width?: number
}

export interface ExcelExportOptions {
  filename: string
  title: string
  company?: ExcelCompany
  columns: ExcelColumn[]
  rows: Record<string, unknown>[]
  total?: { label: string; value: number | string }
}

interface ExcelJSWorkbook {
  creator: string
  created: Date
  addWorksheet: (name: string, options?: Record<string, unknown>) => ExcelJSWorksheet
  xlsx: { writeBuffer: () => Promise<ArrayBuffer> }
}

interface ExcelJSWorksheet {
  columns: Array<{ width?: number }>
  mergeCells: (startRow: number, startCol: number, endRow: number, endCol: number) => void
  getCell: (row: number, col: number) => ExcelJSCell
  getRow: (rowNumber: number) => ExcelJSRow
}

interface ExcelJSCell {
  value: string | number
  font?: Record<string, unknown>
  alignment?: Record<string, unknown>
  fill?: Record<string, unknown>
  border?: Record<string, unknown>
}

interface ExcelJSRow {
  getCell: (col: number) => ExcelJSCell
  eachCell: (callback: (cell: ExcelJSCell, colNumber: number) => void) => void
}

const thinBorder = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

function getCellValue(row: Record<string, unknown>, col: ExcelColumn): string | number {
  const val = typeof col.field === 'function' ? col.field(row) : row[col.field]
  if (val === null || val === undefined) return ''
  if (col.format) return col.format(val, row)
  return String(val)
}

export function useExcelExport() {
  const notify = useNotify()
  const { t } = useLcI18n()
  const i18nStore = useLcI18nStore()
  const locale = i18nStore.locale.value === 'ar' ? 'ar-EG' : 'en-US'

  async function exportTable(options: ExcelExportOptions) {
    const { filename, title, company, columns, rows, total } = options

    if (!rows.length) {
      notify.warning(t('export.noDataToExport'))
      return
    }

    try {
      const exceljsMod = 'exceljs'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExcelJS = await import(/* @vite-ignore */ exceljsMod)
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'FastFree'
      workbook.created = new Date()

      const ws = workbook.addWorksheet(title, {
        views: [{ state: 'frozen', ySplit: 3 }],
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      })

      const numCols = columns.length + 1
      ws.columns = [
        { width: 6 },
        ...columns.map(c => ({ width: c.width || 20 })),
      ]

      // Title row
      ws.mergeCells(1, 1, 1, numCols)
      const titleCell = ws.getCell(1, 1)
      titleCell.value = company?.name || title
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0D47A1' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

      // Info row
      const now = new Date()
      const printDate = now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' })
      ws.mergeCells(2, 1, 2, numCols)
      const infoCell = ws.getCell(2, 1)
      infoCell.value = `${t('export.printDate')}: ${printDate} | ${t('export.recordCount')}: ${rows.length}`
      infoCell.font = { name: 'Arial', size: 10, color: { argb: 'FF666666' } }
      infoCell.alignment = { horizontal: 'center', vertical: 'middle' }

      // Header row
      const headerRow = ws.getRow(3)
      const headers = [t('export.serialNo'), ...columns.map(c => c.label)]
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = h
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = thinBorder
      })

      // Data rows
      rows.forEach((row, index) => {
        const r = ws.getRow(4 + index)
        const rowData: (string | number)[] = [index + 1, ...columns.map(c => getCellValue(row, c))]
        rowData.forEach((val, j) => {
          const cell = r.getCell(j + 1)
          cell.value = val
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
          cell.border = thinBorder
          cell.font = { name: 'Arial', size: 10 }
          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
          }
        })
      })

      // Total row
      if (total) {
        const totalRowIndex = 4 + rows.length + 1
        const totalRow = ws.getRow(totalRowIndex)
        ws.mergeCells(totalRowIndex, 1, totalRowIndex, numCols - 1)
        const totalLabelCell = totalRow.getCell(1)
        totalLabelCell.value = total.label
        totalLabelCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D47A1' } }
        totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' }
        totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
        totalLabelCell.border = thinBorder
        const totalValueCell = totalRow.getCell(numCols)
        totalValueCell.value = total.value
        totalValueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D47A1' } }
        totalValueCell.alignment = { horizontal: 'center', vertical: 'middle' }
        totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
        totalValueCell.border = thinBorder
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const status = exportFile(`${filename}_${dateStr}.xlsx`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      if (status !== true) {
        throw new Error(t('export.downloadRejected'))
      }
      notify.saved(t('export.exportSuccess', { count: rows.length }))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t('export.exportError'))
    }
  }

  async function exportCustom(fn: (workbook: ExcelJSWorkbook) => Promise<void>) {
    try {
      const exceljsMod = 'exceljs'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExcelJS = await import(/* @vite-ignore */ exceljsMod)
      const workbook = new ExcelJS.Workbook()
      await fn(workbook)
      const buffer = await workbook.xlsx.writeBuffer()
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      exportFile(`export_${dateStr}.xlsx`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      notify.saved(t('export.exportSuccess', { count: '' }))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t('export.exportError'))
    }
  }

  return { exportTable, exportCustom }
}
