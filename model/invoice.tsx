import mongoose, { Document, Schema } from 'mongoose';

// Define the InvoiceItem schema
const invoiceItemSchema = new Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
});

// Define the Invoice schema
const invoiceSchema = new Schema({
  invoiceNumber: { type: Number, required: true, unique: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  orderNumber: { type: String, required: true },
  salesperson: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  cgst: { type: Number, required: true },
  sgst: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' }, 
  createdAt: { type: Date, default: Date.now },
});

// Create the Invoice model
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

export default Invoice;
