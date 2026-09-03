import { NotificationItem, UserRole } from '../types';
import { mockNotifications } from '../data';

class NotificationService {
  private notifications: NotificationItem[] = [...mockNotifications];

  async getNotifications(role: UserRole, recipientId?: string): Promise<NotificationItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const filtered = this.notifications.filter(
          (n) =>
            n.recipientRole === 'all' ||
            n.recipientRole === role ||
            (recipientId && n.recipientId === recipientId)
        );
        resolve(filtered);
      }, 150);
    });
  }

  async markAsRead(id: string): Promise<void> {
    const item = this.notifications.find((n) => n.id === id);
    if (item) item.read = true;
  }

  async sendNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }
}

export const notificationService = new NotificationService();
