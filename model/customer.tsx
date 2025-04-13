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
    openingBalance?: number;
    currentBalance?: number;
    createdAt?: Date;
    userId: string;
    selectedCompanyId: string
}

// Define the Customer schema
const CustomerSchema: Schema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: Number },
    openingBalance: { type: Number, default: 0 },
    currentBalance: {
        type: Number,
        default: 0
    },
    createdAt: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selectedCompanyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
});

// Create a compound unique index on email and userId
CustomerSchema.index({ email: 1, userId: 1 }, { unique: true });

const Customer = mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;