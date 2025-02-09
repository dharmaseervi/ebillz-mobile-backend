import mongoose from "mongoose";

export interface IUser extends Document {
  clerkUserId: string;
  email: string;
  fullName: string;
}

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true }, // Clerk's user ID
  email: { type: String, required: true, unique: true }, // Email address
  fullName: { type: String, required: true }, // User's full name
});

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
