/**
 * models/Label.ts
 * Label model — user-created tags/categories for organizing notes.
 * Each label belongs to a specific user and has a color for visual distinction.
 */

import mongoose, { Document, Schema, Model } from "mongoose";

export interface ILabel extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;           // Hex color code e.g. "#3b82f6"
  noteCount: number;       // Virtual / updated field for display
  createdAt: Date;
  updatedAt: Date;
}

const LabelSchema = new Schema<ILabel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Label name is required"],
      trim: true,
      maxlength: [50, "Label name cannot exceed 50 characters"],
    },
    color: {
      type: String,
      required: true,
      default: "#3b82f6",
      match: [/^#([A-Fa-f0-9]{6})$/, "Color must be a valid hex code"],
    },
    noteCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index — each user can only have one label with a given name
LabelSchema.index({ userId: 1, name: 1 }, { unique: true });

const Label: Model<ILabel> =
  mongoose.models.Label || mongoose.model<ILabel>("Label", LabelSchema);

export default Label;
