import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The business selected in the switcher. Its id is sent as X-Business-Id on
 * every tenant request. Persisted so a reload keeps the same business; Stage 2
 * re-validates it against the businesses returned by /auth/me.
 *
 * Changing business (clearing the query cache and POS cart, warning first) is
 * orchestrated in Stage 2; this store only holds the id.
 */
interface BusinessState {
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string | null) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      selectedBusinessId: null,
      setSelectedBusinessId: (id) => set({ selectedBusinessId: id }),
    }),
    {
      name: 'pos.business',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
