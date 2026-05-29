/**
 * Excel处理工具
 * 基于xlsx (SheetJS)库实现Excel文件的读写
 */
import * as XLSX from 'xlsx';
import type { FieldMapping } from '@/types/api';

/** Excel行数据 */
export interface ExcelRow {
  [key: string]: unknown;
}

/** 解析结果 */
export interface ParseResult {
  headers: string[];
  rows: ExcelRow[];
  totalRows: number;
}

/**
 * 解析Excel文件
 * @param file File对象或文件路径
 * @returns 解析后的数据
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
        const headers = getHeaders(sheet);

        resolve({
          headers,
          rows: jsonData,
          totalRows: jsonData.length,
        });
      } catch (err) {
        reject(new Error('Excel文件解析失败，请检查文件格式'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 获取工作表的列头
 */
function getHeaders(sheet: XLSX.WorkSheet): string[] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = sheet[cellAddress];
    headers.push(cell ? String(cell.v) : `列${col + 1}`);
  }
  return headers;
}

/**
 * 按字段映射转换数据
 */
export function applyFieldMapping(rows: ExcelRow[], mapping: FieldMapping): ExcelRow[] {
  return rows.map((row) => {
    const mapped: ExcelRow = {};
    for (const [systemField, excelCol] of Object.entries(mapping)) {
      if (excelCol && row[excelCol] !== undefined) {
        mapped[systemField] = row[excelCol];
      }
    }
    return mapped;
  });
}

/**
 * 生成BOM导入模板
 */
export function generateImportTemplate(): Blob {
  const headers = [
    '型号(Part Number)',
    '数量(Quantity)',
    '厂商(Manufacturer)',
    '类别(Category)',
    '描述(Description)',
    '单位(Unit)',
    '位号(Reference)',
    '备注(Notes)',
  ];
  const exampleRow = ['STM32F407VGT6', 1, 'ST', 'MCU', 'ARM Cortex-M4 MCU', 'PCS', 'U1', '主控芯片'];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // 设置列宽
  ws['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 30 },
    { wch: 8 },
    { wch: 15 },
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOM导入模板');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
}

/**
 * 导出BOM数据为Excel
 */
export function exportBomToExcel(
  data: Array<Record<string, unknown>>,
  headers: Record<string, string>,
  sheetName: string,
): Blob {
  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);

  const wsData = [
    headerValues,
    ...data.map((row) => headerKeys.map((key) => row[key] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 设置列宽
  ws['!cols'] = headerValues.map((h) => ({ wch: Math.max(h.length * 2, 12) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
}

/**
 * 下载Blob为文件
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}