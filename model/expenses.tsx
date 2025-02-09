// models/Expense.js
import mongoose, { Document, Schema, Types } from 'mongoose';


const ExpenseSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selectedCompanyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
