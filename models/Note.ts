import mongoose, {
  Document,
  Schema,
  Model,
} from "mongoose";

export interface INote
  extends Document {
  _id: mongoose.Types.ObjectId;

  userId: mongoose.Types.ObjectId;

  title: string;

  description?: string;

  s3Key: string;

  s3Url: string;

  fileSize: number;

  pageCount?: number;

  labels: mongoose.Types.ObjectId[];

  summary?: string;

  isSummarized: boolean;

  isShared: boolean;

  shareToken?: string;

  extractedText?: string;

  createdAt: Date;

  updatedAt: Date;
}

const NoteSchema =
  new Schema<INote>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: [
          true,
          "Note title is required",
        ],
        trim: true,
        maxlength: [
          200,
          "Title cannot exceed 200 characters",
        ],
      },

      description: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Description cannot exceed 1000 characters",
        ],
        default: "",
      },

      s3Key: {
        type: String,
        required: [
          true,
          "S3 key is required",
        ],
      },

      s3Url: {
        type: String,
        required: [
          true,
          "S3 URL is required",
        ],
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

      /* IMPORTANT FIX */
      shareToken: {
        type: String,
        unique: true,
        sparse: true,
        default: undefined,
      },

      extractedText: {
        type: String,
        default: null,
        select: false,
      },
    },
    {
      timestamps: true,
    }
  );

/* User query index */
NoteSchema.index({
  userId: 1,
  createdAt: -1,
});

/* Share token index */
NoteSchema.index(
  { shareToken: 1 },
  {
    unique: true,
    sparse: true,
  }
);

const Note: Model<INote> =
  mongoose.models.Note ||
  mongoose.model<INote>(
    "Note",
    NoteSchema
  );

export default Note;