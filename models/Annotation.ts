import mongoose, {
  Document,
  Schema,
  Model,
} from "mongoose";
import { PALETTE } from "@/lib/annotations/validation";

export type AnnotationType =
  | "highlight"
  | "scribble";

export interface INormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface INormPoint {
  x: number;
  y: number;
}

export interface IAnnotation
  extends Document {
  _id: mongoose.Types.ObjectId;

  userId: mongoose.Types.ObjectId;

  noteId: mongoose.Types.ObjectId;

  type: AnnotationType;

  pageNumber: number;

  color: string;

  rects: INormRect[];

  points: INormPoint[];

  strokeWidth?: number;

  createdAt: Date;

  updatedAt: Date;
}

const NormRectSchema =
  new Schema<INormRect>(
    {
      x: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      y: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      w: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      h: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
    },
    { _id: false }
  );

const NormPointSchema =
  new Schema<INormPoint>(
    {
      x: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      y: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
    },
    { _id: false }
  );

const AnnotationSchema =
  new Schema<IAnnotation>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      noteId: {
        type: Schema.Types.ObjectId,
        ref: "Note",
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: [
          "highlight",
          "scribble",
        ],
        required: true,
      },

      pageNumber: {
        type: Number,
        required: true,
        min: 1,
        validate: {
          validator:
            Number.isInteger,
          message:
            "pageNumber must be a whole number",
        },
      },

      color: {
        type: String,
        required: true,
        enum: PALETTE,
      },

      rects: {
        type: [NormRectSchema],
        default: [],
      },

      points: {
        type: [NormPointSchema],
        default: [],
      },

      strokeWidth: {
        type: Number,
        min: 1,
        max: 20,
      },
    },
    {
      timestamps: true,
    }
  );

/* Primary access pattern: all annotations for one note owned by one user, by page. */
AnnotationSchema.index({
  noteId: 1,
  userId: 1,
  pageNumber: 1,
});

const Annotation: Model<IAnnotation> =
  mongoose.models.Annotation ||
  mongoose.model<IAnnotation>(
    "Annotation",
    AnnotationSchema
  );

export default Annotation;
