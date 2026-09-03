import { WelfareRecord } from '../types';
import { mockWelfareRecord, cooperativeWelfareOverview } from '../data';

class WelfareService {
  async getWorkerWelfare(workerId: string): Promise<WelfareRecord> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...mockWelfareRecord,
          memberId: `SSF-WLF-${workerId.slice(-3)}`,
        });
      }, 200);
    });
  }

  async getWelfareOverview(): Promise<typeof cooperativeWelfareOverview> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(cooperativeWelfareOverview);
      }, 200);
    });
  }

  async submitClaim(
    _workerId: string,
    benefitType: string,
    claimAmount: number
  ): Promise<{ success: boolean; claimId: string; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          claimId: `CLM-${Date.now().toString().slice(-6)}`,
          message: `Claim for ${benefitType} (₹${claimAmount}) submitted to Cooperative Welfare Board. Tracking initiated.`,
        });
      }, 500);
    });
  }
}

export const welfareService = new WelfareService();
