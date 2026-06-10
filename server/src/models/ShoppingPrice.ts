import mongoose, { Schema, type Document } from 'mongoose';

export interface IShoppingPrice extends Document {
  product: string;
  unit: string;
  martName: string;
  price: number;
  source: 'seed' | 'user';
  updatedAt: Date;
  createdAt: Date;
}

const shoppingPriceSchema = new Schema<IShoppingPrice>(
  {
    product: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    martName: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ['seed', 'user'], default: 'user' },
  },
  { timestamps: true },
);

shoppingPriceSchema.index({ product: 1, unit: 1, martName: 1, updatedAt: -1 });

export default mongoose.model<IShoppingPrice>(
  'ShoppingPrice',
  shoppingPriceSchema,
);
