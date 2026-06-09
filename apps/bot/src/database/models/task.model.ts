import mongoose, { Document, Schema } from 'mongoose';

export interface ISourceMessage {
  messageId: number;
  chatId: number;
  text: string;
  fromUserId: number;
  link: string;
}

export interface ITask extends Document {
  groupId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdBy: mongoose.Types.ObjectId;
  assigneeId?: mongoose.Types.ObjectId;
  dueDate?: Date;
  taskNumber: number;
  sourceMessage?: ISourceMessage;
  completedAt?: Date;
  reminderSent?: boolean;
  taskCardMessageId?: number;
  taskCardChatId?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SourceMessageSchema = new Schema(
  {
    messageId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    text: { type: String, default: '' },
    fromUserId: { type: Number, required: true },
    link: { type: String, default: '' },
  },
  { _id: false }
);

const TaskSchema: Schema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    taskNumber: {
      type: Number,
      required: true,
    },
    sourceMessage: {
      type: SourceMessageSchema,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    taskCardMessageId: {
      type: Number,
      default: null,
    },
    taskCardChatId: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'tasks',
  }
);

TaskSchema.index({ groupId: 1, status: 1 });
TaskSchema.index({ groupId: 1, assigneeId: 1 });
TaskSchema.index({ groupId: 1, createdAt: -1 });
TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ groupId: 1, taskNumber: 1 }, { unique: true });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
