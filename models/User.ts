/**
 * models/User.ts
 * User model — stores credentials and OAuth profile info.
 * Supports both email/password and Google OAuth login.
 */

import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;       // Only set for credential-based accounts
  image?: string;          // Profile picture (Google OAuth users)
  provider: "credentials" | "google";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      // Not required — Google OAuth users won't have a password
      select: false, // Never return password in queries by default
    },
    image: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Prevent model re-compilation during hot reload in development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
