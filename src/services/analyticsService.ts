import { AIDemandForecast } from '../types';
import { mockAIDemandForecasts, mockAdminStats } from '../data';

class AnalyticsService {
  async getAIDemandForecasts(): Promise<AIDemandForecast[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockAIDemandForecasts);
      }, 300);
    });
  }

  async getAdminStats(): Promise<typeof mockAdminStats> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockAdminStats);
      }, 200);
    });
  }
}

export const analyticsService = new AnalyticsService();
