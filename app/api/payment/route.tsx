
import { NextResponse } from 'next/server';
import dbConnect from '@/utli/connectdb';
import Payment from '@/model/payment';
import Invoice from '@/model/invoice';
import { Types } from 'mongoose';

export async function POST(request: Request) {
    await dbConnect();
    try {
        const {
            invoiceId,
            customerId,
            amountPaid,
            paymentMethod,
            paymentDate,
            transactionId,
            paymentStatus,
            payment,
        } = await request.json();
        console.log(paymentMethod);

        // Create a new payment entry
        const newPayment = new Payment({
            invoiceId,
            customerId,
            amountPaid,
            paymentMethod,
            paymentDate,
            transactionId,
            paymentStatus,
            payment,
        });

        await newPayment.save();

        return NextResponse.json(newPayment, { status: 201 });
    } catch (error) {
        console.error('Error creating payment:', error);
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 400 });
    }
}

export async function GET(request: Request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const invoiceId = searchParams.get('invoiceId');
        const customerId = searchParams.get('customerId');
        const paymentStatus = searchParams.get('paymentStatus');

        console.log(invoiceId, 'invoiceId received');

        const filter: any = {};

        // Add filters only if the query parameters are provided
        if (invoiceId) {
            if (Types.ObjectId.isValid(invoiceId)) {
                filter.invoiceId = new Types.ObjectId(invoiceId);
            } else {
                console.error('Invalid ObjectId for invoiceId:', invoiceId);
                return NextResponse.json({ error: 'Invalid invoiceId' }, { status: 400 });
            }
        }
        if (customerId) filter.customerId = customerId;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        console.log('Filter:', filter);

        // Fetch payments from the database
        const payments = await Payment.find(filter).populate('customerId');
        console.log('Payments:', payments);

        return NextResponse.json(payments, { status: 200 });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    await dbConnect();

    try {
        const {
            invoiceId,
            amountPaid,
            paymentMethod,
            paymentDate,
            transactionId,
            payment,
        } = await request.json();

        // Find the invoice by its ID
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Update the invoice status to "paid" (if it is fully paid)
        invoice.status = 'paid';
        invoice.paidAmount = invoice.paidAmount + amountPaid; // Accumulate the paid amount
        if (invoice.paidAmount >= invoice.total) {
            invoice.status = 'paid'; // Mark as fully paid
        }
        await invoice.save();

        // Create the payment record in the payment collection
        const newPayment = new Payment({
            invoiceId,
            customerId: invoice.customerId,
            amountPaid,
            paymentMethod,
            paymentDate,
            transactionId,
            paymentStatus: 'completed', // You can use 'pending' if payment hasn't been fully processed yet
            payment,
        });
        await newPayment.save();

        return NextResponse.json({ message: 'Payment successful', invoice }, { status: 200 });
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        return NextResponse.json({ error: 'Failed to mark invoice as paid' }, { status: 400 });
    }
}