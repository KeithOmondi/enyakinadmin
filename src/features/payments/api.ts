import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MpesaRequest, MpesaRequestRow, Page } from '@/lib/types';

/** Terminal states: once reached, nothing further will change. */
export const isFinal = (s: MpesaRequest['status']) => s !== 'pending';

export function useSendPrompt() {
  return useMutation({
    mutationFn: async (v: { phone: string; amountCents: number; requestKey: string }) =>
      (await api.post<MpesaRequest>('/payments/mpesa/requests', v)).data,
  });
}

/** Polls a prompt every 2 seconds while the customer is deciding. */
export function useMpesaStatus(id: string | null) {
  return useQuery({
    queryKey: ['mpesa', 'request', id],
    enabled: id !== null,
    queryFn: async () => (await api.get<MpesaRequest>(`/payments/mpesa/requests/${id}`)).data,
    refetchInterval: (q) => (q.state.data && isFinal(q.state.data.status) ? false : 2000),
    // A flaky connection must not abandon a payment that is in progress.
    retry: true,
    retryDelay: 2000,
  });
}

export function useMpesaRequests(p: { status?: string; unmatched?: boolean; page: number }) {
  return useQuery({
    queryKey: ['mpesa', 'list', p],
    queryFn: async () => (await api.get<Page<MpesaRequestRow>>('/payments/mpesa/requests', { params: { ...p, pageSize: 25 } })).data,
    placeholderData: keepPreviousData,
  });
}

// ---- connection settings (Safaricom Daraja keys, entered in the dashboard) --------------------------

export interface MpesaSettings {
  serverMode: 'off' | 'simulator' | 'daraja';
  environment: 'sandbox' | 'production';
  encryptionReady: boolean;
  sharedConsumerAvailable: boolean;
  /** dashboard: saved here. server: set on the server. none: not set up. */
  source: 'dashboard' | 'server' | 'none';
  configured: boolean;
  enabled: boolean;
  transactionType: 'till' | 'paybill';
  shortcode: string;
  partyB: string;
  passkeyHint: string | null;
  consumerKeyHint: string | null;
  hasConsumerSecret: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface MpesaSettingsInput {
  enabled: boolean;
  transactionType: 'till' | 'paybill';
  shortcode: string;
  partyB?: string | null;
  passkey?: string;
  consumerKey?: string;
  consumerSecret?: string;
  password: string;
}

export function useMpesaSettings() {
  return useQuery({
    queryKey: ['mpesa', 'settings'],
    queryFn: async () => (await api.get<MpesaSettings>('/payments/mpesa/settings')).data,
  });
}

function useSettingsMutation<V>(fn: (v: V) => Promise<MpesaSettings>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['mpesa', 'settings'], data);
      // The till reads the payment mode from the business profile.
      void qc.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

export const useSaveMpesaSettings = () =>
  useSettingsMutation(async (v: MpesaSettingsInput) => (await api.put<MpesaSettings>('/payments/mpesa/settings', v)).data);

export const useRemoveMpesaSettings = () =>
  useSettingsMutation(async (v: { password: string }) => (await api.post<MpesaSettings>('/payments/mpesa/settings/remove', v)).data);

export function useTestMpesaSettings() {
  return useMutation({
    mutationFn: async () => (await api.post<{ ok: boolean; message: string }>('/payments/mpesa/settings/test')).data,
  });
}
