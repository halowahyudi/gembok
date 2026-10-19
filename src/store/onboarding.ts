import { create } from 'zustand';

import type { EmergencyKitData } from '@/auth/emergency-kit';

type OnboardingState = {
  // Carries the Emergency Kit from signup to the confirmation screen.
  emergencyKit: EmergencyKitData | null;
  setEmergencyKit: (kit: EmergencyKitData) => void;
  clearEmergencyKit: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  emergencyKit: null,
  setEmergencyKit: (kit) => set({ emergencyKit: kit }),
  clearEmergencyKit: () => set({ emergencyKit: null }),
}));
