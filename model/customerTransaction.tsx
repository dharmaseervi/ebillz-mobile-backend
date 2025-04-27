// models/Transaction.js
import mongoose, { Schema } from 'mongoose';

const CustomerTransactionSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  type: {
    type: String,
    enum: ['invoice', 'payment', 'credit_note', 'opening_balance', 'reversal_payment', 'reversal_invoice'],
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
  reversed: {
    type: Boolean,
    default: false
  }
  ,
  invoiceRef: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice'
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
  },
  originalTxnId: {
    type: Schema.Types.ObjectId,
    ref: 'CustomerTransaction'
  },
}, { timestamps: true });

export default mongoose.models.CustomerTransaction || mongoose.model('CustomerTransaction', CustomerTransactionSchema);
