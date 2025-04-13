
import { NextResponse } from 'next/server';
import dbConnect from '@/utli/connectdb';
import Payment from '@/model/payment';
import Invoice from '@/model/invoice';
import { Types } from 'mongoose';
import User from '@/model/user';

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
            clerkUserId,
            selectedCompanyId
        } = await request.json();

        console.log(clerkUserId, selectedCompanyId, 'selected company id');
        // Ensure selectedCompanyId is provided
        if (!selectedCompanyId) {
            return NextResponse.json({ success: false, error: "Selected company ID is required" }, { status: 400 });
        }

        // Find user by Clerk User ID
        const user = await User.findOne({ clerkUserId });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }
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
            selectedCompanyId,
            userId: user._id
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
        const paymentStatus = searchParams.get('paymentStatus');
        const selectedCompanyId = searchParams.get('selectedCompanyId');
        const clerkUserId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);

 
        

        if (!selectedCompanyId) {
            return NextResponse.json({ success: false, error: "Selected company ID is required" }, { status: 400 });
        }

        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const filter: any = {
            selectedCompanyId
        };

        if (invoiceId) {
            if (Types.ObjectId.isValid(invoiceId)) {
                filter.invoiceId = new Types.ObjectId(invoiceId);
            } else {
                return NextResponse.json({ error: 'Invalid invoiceId' }, { status: 400 });
            }
        }


        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const [payments, total] = await Promise.all([
            Payment.find(filter)
                .populate('customerId')
                .populate({ path: 'invoiceId', select: 'invoiceNumber total date' })
                .skip((page - 1) * limit)
                .limit(limit),
            Payment.countDocuments(filter)
        ]);

        return NextResponse.json({
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }, { status: 200 });

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