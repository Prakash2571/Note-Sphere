/**
 * models/Note.ts
 * Note model — the core entity. Stores metadata about uploaded PDFs.
 * The actual PDF file is stored in AWS S3; we store the S3 key here.
 */

import mongoose, { Document, Schema, Model } from "mongoose";

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  s3Key: string;           // AWS S3 object key (e.g. "notes/userId/uuid.pdf")
  s3Url: string;           // Full S3 URL for direct access
  fileSize: number;        // File size in bytes
  pageCount?: number;      // Number of pages in the PDF
  labels: mongoose.Types.ObjectId[];  // References to Label documents
  summary?: string;        // AI-generated summary from Gemini
  isSummarized: boolean;   // Whether AI summary has been generated
  isShared: boolean;       // Whether the note has a public share link
  shareToken?: string;     // Unique token for the public share link
  extractedText?: string;  // Text extracted from PDF (used for AI summary)
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    s3Key: {
      type: String,
      required: [true, "S3 key is required"],
    },
    s3Url: {
      type: String,
      required: [true, "S3 URL is required"],
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    pageCount: {
      type: Number,
      default: null,
    },
    labels: [
      {
        type: Schema.Types.ObjectId,
        ref: "Label",
      },
    ],
    summary: {
      type: String,
      default: null,
    },
    isSummarized: {
      type: Boolean,
      default: false,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,  // sparse allows multiple documents with null shareToken
      default: null,
    },
    extractedText: {
      type: String,
      default: null,
      select: false,  // Don't return this large field by default
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast user-specific queries
NoteSchema.index({ userId: 1, createdAt: -1 });

// Index for share token lookups
NoteSchema.index({ shareToken: 1 });

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

export default Note;
