import mongoose, { Document, Schema, Types } from 'mongoose';

// Define an interface for the Customer document
export interface ICustomer extends Document {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: number;
    createdAt?: Date;
    userId: string;
}

// Define the Customer schema
const customerSchema: Schema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: Number },
    createdAt: { type: Date, default: Date.now },
    userId: { type: String, required: true },
});

// Create a compound unique index on email and userId
customerSchema.index({ email: 1, userId: 1 }, { unique: true });

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);
