import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReportSummary, StockValuationRow } from '@/lib/types';

export function useReportSummary(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'summary', from, to],
    enabled: from <= to,
    queryFn: async () => (await api.get<ReportSummary>('/reports/summary', { params: { from, to } })).data,
  });
}

export function useStockValuation() {
  return useQuery({
    queryKey: ['reports', 'valuation'],
    queryFn: async () => (await api.get<{ items: StockValuationRow[] }>('/reports/stock-valuation')).data.items,
  });
}
