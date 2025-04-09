// models/Transaction.js
import mongoose, { Schema } from 'mongoose';

const TransactionSchema = new Schema({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  type: {
    type: String,
    enum: ['invoice', 'payment', 'credit_note', 'opening_balance'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        // Allow 0 only if type is not 'invoice' or 'payment'
        if (this && this.type === 'invoice' || this.type === 'payment') {
          return value > 0;
        }
        return true;
      },
      message: 'Amount must be greater than 0'
    }
  },
  mode: {
    type: String,
    enum: ['cash', 'cheque', 'rtgs', 'neft', 'upi', 'other'],
    required: function () {
      return this.type === 'payment';
    }
  },
  reference: {
    type: String,
    required: function () {
      return this.type === 'payment';
    }
  },
  invoiceRef: {
    type: Schema.Types.ObjectId,
    ref: 'PurchaseInvoice'
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  selectedCompanyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true
  }
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);