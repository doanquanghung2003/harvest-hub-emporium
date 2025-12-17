export type Favorite = { productId: string };

const KEY = (userId: string) => `favorites:${userId}`;

function read(userId: string): Favorite[] {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(userId: string, list: Favorite[]) {
  localStorage.setItem(KEY(userId), JSON.stringify(list));
  try { window.dispatchEvent(new CustomEvent('wishlist:updated')); } catch {}
}

export const favoritesService = {
  list(userId: string): Favorite[] {
    return read(userId);
  },
  isFavorite(userId: string, productId: string): boolean {
    return read(userId).some(f => f.productId === productId);
  },
  toggle(userId: string, productId: string): boolean {
    const list = read(userId);
    const idx = list.findIndex(f => f.productId === productId);
    if (idx >= 0) {
      list.splice(idx, 1);
      write(userId, list);
      return false;
    } else {
      list.push({ productId });
      write(userId, list);
      return true;
    }
  },
  count(userId: string): number {
    return read(userId).length;
  }
};


