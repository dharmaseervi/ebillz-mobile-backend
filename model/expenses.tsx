// models/Expense.js
import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
