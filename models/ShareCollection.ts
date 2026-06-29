/**
 * models/ShareCollection.ts
 * A "share collection" (bundle) links a single public share token to MANY notes.
 *
 * This powers the multi-PDF share feature: a user selects several PDFs, we mint
 * one token, and the public viewer renders/downloads every PDF in the bundle.
 *
 * Note: single-note sharing still lives on the Note model (`shareToken`). This
 * model is intentionally separate so the two flows never collide.
 */

import mongoose, { Document, Schema, Model } from "mongoose";

export interface IShareCollection extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  token: string;
  notes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ShareCollectionSchema = new Schema<IShareCollection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      default: "Shared PDFs",
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },

    notes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Note",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

/* Owner listing index */
ShareCollectionSchema.index({ userId: 1, createdAt: -1 });

/* Public token lookup index */
ShareCollectionSchema.index({ token: 1 }, { unique: true });

const ShareCollection: Model<IShareCollection> =
  mongoose.models.ShareCollection ||
  mongoose.model<IShareCollection>("ShareCollection", ShareCollectionSchema);

export default ShareCollection;
