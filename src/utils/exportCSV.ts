// SDK 56: new API from 'expo-file-system', legacy from 'expo-file-system/legacy'
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Expense } from '../redux/expenseSlice';

/**
 * Escape a CSV cell value (handle semicolons, quotes, newlines)
 */
function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(';') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of expenses to a CSV string.
 * Uses semicolon separator — compatible with Excel (French locale).
 */
export function generateCSV(expenses: Expense[]): string {
  const headers = ['Date', 'Type', 'Catégorie', 'Description', 'Montant (GNF)', 'Statut'];

  const rows = expenses.map(exp => {
    const date = new Date(exp.date);
    const dateStr = date.toLocaleDateString('fr-GN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return [
      dateStr,
      exp.type === 'income' ? 'Revenu' : 'Dépense',
      exp.category,
      exp.description || '',
      exp.amount.toLocaleString('fr-GN'),
      exp.status === 'planned' ? 'Prévu' : 'Réel',
    ].map(escapeCSV).join(';');
  });

  // BOM (\uFEFF) ensures Excel reads UTF-8 correctly on Windows
  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

/**
 * Write a .csv file to the cache directory and open the native share sheet.
 * Uses stable legacy expo-file-system API + expo-sharing.
 */
export async function exportToCSV(
  expenses: Expense[],
  fileName?: string,
  exportDirectoryUri?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (expenses.length === 0) {
      return { success: false, error: 'Aucune transaction à exporter.' };
    }

    // Build filename
    const now  = new Date();
    const name = fileName
      ?? `FinTech_Guinee_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.csv`;

    const csvData = generateCSV(expenses);

    // If running on web, prompt download directly
    if (Platform.OS === 'web') {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: "Le partage de fichiers n'est pas disponible sur cet appareil." };
    }

    // If user has a default export directory configured via SAF (Android only)
    if (Platform.OS === 'android' && exportDirectoryUri) {
      try {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(exportDirectoryUri, name, 'text/csv');
        await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, csvData, { encoding: 'utf8' });
        return { success: true };
      } catch (safError: any) {
        console.warn("SAF export failed, falling back to Sharing", safError);
        // Fallback to sharing if SAF write fails
      }
    }

    // Write to cache using legacy FileSystem API
    const fileUri = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.writeAsStringAsync(fileUri, csvData, { encoding: FileSystem.EncodingType.UTF8 });

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exporter les transactions',
      UTI: 'public.comma-separated-values-text',
    });

    return { success: true };
  } catch (err: any) {
    console.error('Export CSV error:', err);
    return { success: false, error: err?.message ?? "Erreur lors de l'export." };
  }
}
