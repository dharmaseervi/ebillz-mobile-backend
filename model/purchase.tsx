import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPurchaseInvoice extends Document {
    invoiceNumber: number;
    purchaseOrderNumber: number;
    supplierName: string;
    supplierId: Types.ObjectId;
    purchaseDate: Date;
    dueDate: Date;
    items: {
        productId: Types.ObjectId;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }[];
    invoiceStatus: string;
    totalAmount: number;
    userId: string;
}

const purchaseInvoiceSchema = new Schema<IPurchaseInvoice>({
    invoiceNumber: { type: Number, required: true },
    purchaseOrderNumber: { type: Number, required: true },
    supplierName: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchaseDate: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    items: [
        {
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            unitPrice: { type: Number, required: true },
            totalPrice: { type: Number, required: true },
        },
    ],
    invoiceStatus: {
        type: String,
        enum: ['paid', 'not paid', 'pending', 'partially paid', 'canceled'],
        default: 'not paid'
    },
    totalAmount: { type: Number, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

purchaseInvoiceSchema.index({ invoiceNumber: 1 });
purchaseInvoiceSchema.index({ supplierId: 1 });
purchaseInvoiceSchema.index({ userId: 1 });

const Purchase = mongoose.models.PurchaseInvoice || mongoose.model<IPurchaseInvoice>('PurchaseInvoice', purchaseInvoiceSchema);
export default Purchase;
