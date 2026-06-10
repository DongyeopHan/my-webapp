export type ShoppingPriceSource = 'seed' | 'user';

export type ShoppingPriceEntry = {
  id: string;
  martName: string;
  price: number;
  source: ShoppingPriceSource;
  updatedAt: string;
};

export type ShoppingPriceItem = {
  product: string;
  unit: string;
  prices: ShoppingPriceEntry[];
};

export type ShoppingPriceListResponse = {
  items: ShoppingPriceItem[];
};

export type CreateShoppingPricePayload = {
  product: string;
  unit: string;
  martName: string;
  price: number;
};
