export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: number;
};

export const notificationService = {
  async getSellerNotifications(userId: string) : Promise<Notification[]> {
    const res = await fetch(`/api/notifications/user/${userId}`);
    if (!res.ok) throw new Error("Không thể tải thông báo");
    return res.json();
  }
};
