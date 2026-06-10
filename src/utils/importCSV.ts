import { Expense } from '../redux/expenseSlice';
import { v4 as uuidv4 } from 'uuid';

/**
 * Detect the separator used in a CSV string (semicolon or comma)
 */
function detectSeparator(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas     = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

/**
 * Parse a single CSV line respecting quoted values
 */
function parseLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse a date string (dd/mm/yyyy or yyyy-mm-dd) to ISO string
 */
function parseDate(raw: string): string {
  // Try dd/mm/yyyy
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).toISOString();
  }
  // Try yyyy-mm-dd
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).toISOString();
  }
  // Fallback: current date
  return new Date().toISOString();
}

/**
 * Parse amount string to number (handles spaces and GNF formatting)
 */
function parseAmount(raw: string): number {
  // Remove spaces, non-breaking spaces, "GNF", letters
  const cleaned = raw.replace(/[\s\u00A0]/g, '').replace(/[a-zA-Z]/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

export interface ImportResult {
  success: boolean;
  expenses: Partial<Expense>[];
  skipped: number;
  error?: string;
}

/**
 * Parse CSV content string into an array of partial Expense objects.
 * Handles the FinTechGuinee CSV format and common variations.
 */
export function parseCSV(content: string): ImportResult {
  try {
    // Remove BOM if present
    const cleaned = content.replace(/^\uFEFF/, '');
    const lines   = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
      return { success: false, expenses: [], skipped: 0, error: 'Fichier CSV vide ou invalide.' };
    }

    const sep      = detectSeparator(lines[0]);
    const headers  = parseLine(lines[0], sep).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));

    // Map header names to column indices
    const colDate   = headers.findIndex(h => h.includes('date'));
    const colType   = headers.findIndex(h => h.includes('type'));
    const colCat    = headers.findIndex(h => h.includes('cat'));
    const colDesc   = headers.findIndex(h => h.includes('desc'));
    const colAmount = headers.findIndex(h => h.includes('mont') || h.includes('amount'));
    const colStatus = headers.findIndex(h => h.includes('stat'));

    if (colDate === -1 || colAmount === -1) {
      return { success: false, expenses: [], skipped: 0, error: "Colonnes 'Date' et 'Montant' introuvables dans le fichier." };
    }

    const expenses: Partial<Expense>[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i], sep);
      if (cells.length < 2) { skipped++; continue; }

      const amount = parseAmount(cells[colAmount] ?? '');
      if (amount === 0) { skipped++; continue; }

      // Determine type
      const typeRaw = (cells[colType] ?? '').toLowerCase();
      const type: 'income' | 'expense' =
        typeRaw.includes('revenu') || typeRaw.includes('income') ? 'income' : 'expense';

      // Determine status
      const statusRaw = (cells[colStatus] ?? '').toLowerCase();
      const status: 'real' | 'planned' =
        statusRaw.includes('prévu') || statusRaw.includes('prevu') || statusRaw.includes('planned')
          ? 'planned'
          : 'real';

      expenses.push({
        id: uuidv4(),
        date: colDate >= 0 ? parseDate(cells[colDate] ?? '') : new Date().toISOString(),
        type,
        category: cells[colCat] ?? 'Autre',
        description: cells[colDesc] ?? '',
        amount,
        status,
        currency: 'GNF',
        icon: 'cash',
      });
    }

    return { success: true, expenses, skipped };
  } catch (err: any) {
    return { success: false, expenses: [], skipped: 0, error: err?.message ?? 'Erreur de parsing.' };
  }
}
