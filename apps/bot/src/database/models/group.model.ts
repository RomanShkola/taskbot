import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  telegramGroupId: number;
  groupName: string;
  taskCounter: number;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema(
  {
    telegramGroupId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    taskCounter: {
      type: Number,
      default: 0,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  {
    timestamps: true,
    collection: 'groups',
  }
);

GroupSchema.index({ telegramGroupId: 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
