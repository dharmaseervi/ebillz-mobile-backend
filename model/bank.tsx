import mongoose from 'mongoose';

const BankSchema = new mongoose.Schema(
    {
        accountName: {
            type: String,
            required: true,
            trim: true,
        },
        accountNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        ifscCode: {
            type: String,
            required: true,
            trim: true,
        },
        bankName: {
            type: String,
            required: true,
            trim: true,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Bank || mongoose.model('Bank', BankSchema);
