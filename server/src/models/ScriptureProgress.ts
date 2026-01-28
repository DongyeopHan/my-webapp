import mongoose, { Schema, Document } from 'mongoose';

export interface IScriptureProgress extends Document {
  userId: mongoose.Types.ObjectId;
  bookName: string;
  readChapters: number[];
  updatedAt: Date;
}

const ScriptureProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bookName: { type: String, required: true },
  readChapters: [{ type: Number }],
  updatedAt: { type: Date, default: Date.now },
});

// userId와 bookName의 조합을 유니크하게 설정
ScriptureProgressSchema.index({ userId: 1, bookName: 1 }, { unique: true });

export default mongoose.model<IScriptureProgress>(
  'ScriptureProgress',
  ScriptureProgressSchema,
);
