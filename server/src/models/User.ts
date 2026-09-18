import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  loginId: string;
  username?: string;
  password: string;
  name: string;
  monthlyBudget?: number;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  loginId: { type: String, required: true, unique: true },
  // Legacy field kept for backwards compatibility with pre-loginId documents.
  username: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  monthlyBudget: { type: Number, default: 3000000, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
