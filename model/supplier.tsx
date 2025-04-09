import mongoose, { Schema } from 'mongoose';

const SupplierSchema = new mongoose.Schema({
    name: { type: String, require: true },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
    },
    phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number'],  // 10-digit phone number validation
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    gst: {
        type: String,
        required: true,
        unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selectedCompanyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    openingBalance: {
        type: Number,
        default: 0,
        min: [0, 'Opening balance cannot be negative']
    },
    balanceType: {
        type: String,
        enum: ['credit', 'debit'],
        default: 'credit'
    },
    currentBalance: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

// Adding indexes
SupplierSchema.index({ email: 1 });
SupplierSchema.index({ phone: 1 });

export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
