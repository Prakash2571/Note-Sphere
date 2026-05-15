
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;       
  image?: string;          
  provider: "credentials" | "google";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required:true ,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    password: {
      type: String,
      
      select: false,  
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
    timestamps: true, 
  }
);


const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
