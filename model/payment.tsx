import mongoose, { Document, Schema } from 'mongoose';

// Payment Methods Enum (you can expand this list based on your requirements)
enum PaymentMethod {
    CASH = 'Cash',
    CARD = 'card',
    UPI = 'UPI',
    NET_BANKING = 'Net Banking',
    OTHER = 'Other',
}

interface Payment extends Document {
    invoiceId: mongoose.Schema.Types.ObjectId; // Reference to the Invoice
    customerId: mongoose.Schema.Types.ObjectId; // Reference to the Customer making the payment
    amountPaid: number; // Amount paid in the payment
    paymentMethod: PaymentMethod; // Payment method (Cash, Card, etc.)
    paymentDate: Date; // Date when payment was made
    transactionId?: string; // Optional transaction ID if available (for tracking)
    paymentStatus: 'pending' | 'completed' | 'failed'; // Status of the payment
    payment?: number; // Optional additional details about the payment
}

const PaymentSchema = new Schema<Payment>(
    {
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
            required: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        amountPaid: {
            type: Number,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'upi', 'bank_transfer'], 
            required: true,
        },
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        transactionId: {
            type: String,
            required: false,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending',
        },
        payment: {
            type: Number,
            required: false,
        },
    },
    { timestamps: true } // This will automatically create `createdAt` and `updatedAt` fields
);

// Create the Payment model
const Payment = mongoose.models.Payment || mongoose.model<Payment>('Payment', PaymentSchema);

export default Payment;
