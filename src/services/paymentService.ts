export interface PaymentInitiation {
  bookingId: string;
  amount: number;
  method: 'upi' | 'card' | 'netbanking' | 'cash';
  upiVpa?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  timestamp: string;
  gatewayMessage: string;
}

class PaymentService {
  async processPayment(params: PaymentInitiation): Promise<PaymentResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulated mock payment gateway response
        resolve({
          success: true,
          transactionId: `TXN-COOP-${Date.now().toString().slice(-8)}`,
          timestamp: new Date().toISOString(),
          gatewayMessage: `Payment of ₹${params.amount} simulated successfully via ${params.method.toUpperCase()}. (Mock Payment Gateway)`,
        });
      }, 700);
    });
  }
}

export const paymentService = new PaymentService();
