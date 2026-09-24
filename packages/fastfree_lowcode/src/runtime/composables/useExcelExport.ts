import { exportFile } from 'quasar'
import type { Cell, Workbook } from 'exceljs'
import { useNotify } from './useNotify'
import { useLcI18n } from '../i18n'
import { useLcI18nStore } from './useLcI18nStore'

export interface ExcelCompany {
  name: string
  taxNumber?: string
  phone?: string
  commercialRegister?: string
  address?: string
  logo?: string
}

export interface ExcelColumn {
  name: string
  label: string
  field: string | ((row: Record<string, unknown>) => unknown)
  format?: (value: unknown, row: Record<string, unknown>) => string
  width?: number
  type?: 'string' | 'number' | 'date'
}

export interface ExcelExportOptions {
  filename: string
  title: string
  company?: ExcelCompany
  columns: ExcelColumn[]
  rows: Record<string, unknown>[]
  total?: { label: string; value: number | string }
  totalColumn?: string
}

const thinBorder = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

function getCellValue(row: Record<string, unknown>, column: ExcelColumn): string | number {
  const value = typeof column.field === 'function' ? column.field(row) : row[column.field]
  if (value === null || value === undefined) return ''
  if (column.format) return column.format(value, row)
  if (typeof value === 'number') return value
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  return ''
}

export function useExcelExport() {
  const notify = useNotify()
  const { t } = useLcI18n()
  const i18nStore = useLcI18nStore()
  const locale = i18nStore.locale.value === 'ar' ? 'ar-EG' : 'en-US'

  async function exportTable(options: ExcelExportOptions) {
    const { filename, title, company, columns, rows, total, totalColumn } = options

    if (!rows.length) {
      notify.warning(t('export.noDataToExport'))
      return
    }

    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'FastFree'
      workbook.created = new Date()

      const worksheetName =
        title
          .replace(/[\\/*?:[\]]/g, ' ')
          .trim()
          .slice(0, 31) || 'Report'
      const ws = workbook.addWorksheet(worksheetName, {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      })

      const numCols = columns.length + 1
      ws.columns = [{ width: 6 }, ...columns.map((column) => ({ width: column.width || 20 }))]

      const mergeAndStyle = (
        row: number,
        value: string,
        size: number,
        bold: boolean,
        color: string,
      ) => {
        ws.mergeCells(row, 1, row, numCols)
        const cell = ws.getCell(row, 1)
        cell.value = value
        cell.font = { name: 'Arial', size, bold, color: { argb: color } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      }

      mergeAndStyle(1, company?.name || title, 16, true, 'FF0D47A1')
      mergeAndStyle(2, title, 12, true, 'FF333333')

      let infoRow = 3
      const metaInfo = [
        company?.taxNumber ? `${t('print.taxNumber')}: ${company.taxNumber}` : '',
        company?.phone ? `${t('print.phone')}: ${company.phone}` : '',
        company?.commercialRegister
          ? `${t('print.commercialRegister')}: ${company.commercialRegister}`
          : '',
        company?.address || '',
      ]
        .filter(Boolean)
        .join(' | ')
      if (metaInfo) {
        mergeAndStyle(infoRow, metaInfo, 10, false, 'FF666666')
        infoRow += 1
      }

      const now = new Date()
      const printDate = now.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        numberingSystem: 'latn',
      })
      mergeAndStyle(
        infoRow,
        `${t('export.printDate')}: ${printDate} | ${t('export.recordCount')}: ${rows.length}`,
        10,
        false,
        'FF666666',
      )
      infoRow += 1

      const headerRowIndex = infoRow + 1
      ws.views = [{ state: 'frozen', ySplit: headerRowIndex }]
      const headerRow = ws.getRow(headerRowIndex)
      const headers = [t('export.serialNo'), ...columns.map((column) => column.label)]
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = header
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = thinBorder
      })

      rows.forEach((row, rowIndex) => {
        const excelRow = ws.getRow(headerRowIndex + 1 + rowIndex)
        const rowData: Array<string | number> = [
          rowIndex + 1,
          ...columns.map((column) => getCellValue(row, column)),
        ]
        rowData.forEach((value, columnIndex) => {
          const cell = excelRow.getCell(columnIndex + 1)
          const sourceColumn = columnIndex === 0 ? undefined : columns[columnIndex - 1]
          cell.value = value
          cell.alignment = {
            horizontal:
              sourceColumn?.type === 'number' ? 'center' : columnIndex === 0 ? 'center' : 'right',
            vertical: 'middle',
            wrapText: true,
          }
          cell.border = thinBorder
          cell.font = { name: 'Arial', size: 10 }
          if (sourceColumn?.type === 'number') cell.numFmt = '#,##0.00'
          if (rowIndex % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
          }
        })
      })

      if (total) {
        const totalRowIndex = headerRowIndex + rows.length + 2
        const totalRow = ws.getRow(totalRowIndex)
        const totalColumnIndex = totalColumn
          ? columns.findIndex((column) => column.name === totalColumn)
          : -1
        const styleTotalCell = (cell: Cell, value: string | number, numeric = false) => {
          cell.value = value
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D47A1' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
          cell.border = thinBorder
          if (numeric) cell.numFmt = '#,##0.00'
        }
        if (totalColumnIndex >= 0) {
          for (let columnIndex = 1; columnIndex <= numCols; columnIndex += 1) {
            const cell = totalRow.getCell(columnIndex)
            const isValueCell = columnIndex === totalColumnIndex + 2
            const isLabelCell = totalColumnIndex > 0 && columnIndex === totalColumnIndex + 1
            styleTotalCell(
              cell,
              isValueCell ? total.value : isLabelCell ? total.label : '',
              isValueCell,
            )
          }
        } else {
          ws.mergeCells(totalRowIndex, 1, totalRowIndex, numCols - 1)
          styleTotalCell(totalRow.getCell(1), total.label)
          styleTotalCell(totalRow.getCell(numCols), total.value, typeof total.value === 'number')
        }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const status = exportFile(
        `${filename}_${dateStr}.xlsx`,
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      if (status !== true) throw new Error(t('export.downloadRejected'))
      notify.saved(t('export.exportSuccess', { count: rows.length }))
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t('export.exportError'))
    }
  }

  async function exportCustom(fn: (workbook: Workbook) => Promise<void>) {
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await fn(workbook)
      const buffer = await workbook.xlsx.writeBuffer()
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      exportFile(
        `export_${dateStr}.xlsx`,
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      notify.saved(t('export.exportSuccess', { count: '' }))
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t('export.exportError'))
    }
  }

  return { exportTable, exportCustom }
}
