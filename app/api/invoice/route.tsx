import Invoice from '@/model/invoice';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';
import ProductDocument from "@/model/item";
import mongoose from 'mongoose';

export async function POST(request: Request) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            invoiceDate,
            dueDate,
            orderNumber,
            salesperson,
            customerId,
            items,
            subtotal,
            discount,
            cgst,
            sgst,
            tax,
            total,
        } = await request.json();

        // Fetch the latest invoice number and increment it
        const lastInvoice = await Invoice.findOne().sort({ invoiceNumber: -1 }).limit(1);
        const invoiceNumber = lastInvoice ? lastInvoice.invoiceNumber + 1 : 1;

        // Create the new invoice
        const newInvoice = new Invoice({
            invoiceNumber,
            invoiceDate,
            dueDate,
            orderNumber,
            salesperson,
            customerId,
            items,
            subtotal,
            discount,
            cgst,
            sgst,
            tax,
            total,
            status: 'unpaid',
        });

        // Save the invoice within the transaction
        await newInvoice.save({ session });

        // Update stock for each item
        for (const item of items) {
            const { 
                itemId, quantity } = item;

            const existingItem = await ProductDocument.findById(
                itemId).session(session);
            if (!existingItem) {
                throw new Error(`Item with ID ${
                    itemId} not found`);
            }

            if (existingItem.quantity < quantity) {
                throw new Error(`Insufficient stock for product ID ${
                    itemId}`);
            }

            existingItem.quantity -= quantity;
            await existingItem.save({ session });
        }

        // Commit the transaction
        await session.commitTransaction();

        return NextResponse.json(newInvoice, { status: 201 });
    } catch (error: any) {
        await session.abortTransaction();
        console.error("Error creating invoice:", error.message);
        return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 400 });
    } finally {
        session.endSession();
    }
}


export async function GET(request: Request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const status = searchParams.get("status");
        const query = searchParams.get("query");

        console.log("Request Params - ID:", id, "Status:", status, "Query:", query);

        // Fetch by ID if provided
        if (id) {
            const invoice = await Invoice.findById(id)
                .populate("customerId")
                .populate("items.itemId");

            if (!invoice) {
                return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
            }
            return NextResponse.json(invoice, { status: 200 });
        }

        // Initialize the base filter
        const filter: any = {};
        if (status) {
            filter.status = status; // Apply status filter
        }

        let invoices;

        if (query) {
            // Detect if query is numeric
            const isNumericQuery = !isNaN(Number(query));
            const regexFilter = !isNumericQuery ? new RegExp(query, "i") : null;
            const numberQuery = isNumericQuery ? Number(query) : null;

            console.log("Query Processing - Is Numeric:", isNumericQuery, "Regex Filter:", regexFilter, "Number Query:", numberQuery);

            if (numberQuery !== null) {
                // Exact match for invoiceNumber
                invoices = await Invoice.find({
                    ...filter,
                    invoiceNumber: numberQuery,
                })
                    .populate("customerId")
                    .lean();
            } else if (regexFilter) {
                // Match customer fullName or email
                const allInvoices = await Invoice.find(filter)
                    .populate("customerId")
                    .lean();

                invoices = allInvoices.filter((invoice) => {
                    const customer = invoice.customerId;
                    return (
                        customer?.fullName?.match(regexFilter) || // Match fullName
                        customer?.email?.match(regexFilter) // Match email
                    );
                });
            }
        } else {
            // Fetch invoices by status only (or all if no status/query provided)
            invoices = await Invoice.find(filter)
                .populate("customerId")
                .lean();
        }

        console.log("Filtered Invoices:", invoices);

        return NextResponse.json(invoices, { status: 200 });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 400 });
    }
}



export async function PATCH(request: Request) {
    await dbConnect();
    try {
        const { _id, paymentMethod, paymentDetails, paidAmount } = await request.json();


        // Find the invoice by its ID
        const invoice = await Invoice.findById(_id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Update the payment information and status
        invoice.paymentMethod = paymentMethod;
        invoice.paymentDetails = paymentDetails;
        invoice.paidAmount = paidAmount;
        invoice.status = 'paid'; // Mark the invoice as paid

        // Optionally, update the remaining balance if needed
        const remainingBalance = invoice.total - paidAmount;
        invoice.remainingBalance = remainingBalance >= 0 ? remainingBalance : 0;

        await invoice.save();

        return NextResponse.json(invoice, { status: 200 });
    } catch (error) {
        console.error('Error updating invoice payment:', error);
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 400 });
    }
}
export async function PUT(request: Request) {
    await dbConnect();
    try {
        // Extract invoice data from the request body
        const {
            _id, // ID of the invoice to be updated
            invoiceDate,
            dueDate,
            orderNumber,
            salesperson,
            customerId,
            items,
            subtotal,
            discount,
            cgst,
            sgst,
            tax,
            total,
            status, // Update status if needed
            paymentMethod,
            paymentDetails,
            paidAmount,
        } = await request.json();

        // Find the invoice by its ID
        const invoice = await Invoice.findById(_id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Update the entire invoice with the new data
        invoice.invoiceDate = invoiceDate;
        invoice.dueDate = dueDate;
        invoice.orderNumber = orderNumber;
        invoice.salesperson = salesperson;
        invoice.customerId = customerId;
        invoice.items = items;
        invoice.subtotal = subtotal;
        invoice.discount = discount;
        invoice.cgst = cgst;
        invoice.sgst = sgst;
        invoice.tax = tax;
        invoice.total = total;
        invoice.status = status || invoice.status; // If no new status, keep existing one
        invoice.paymentMethod = paymentMethod || invoice.paymentMethod; // If no payment method, keep existing one
        invoice.paymentDetails = paymentDetails || invoice.paymentDetails; // If no payment details, keep existing one
        invoice.paidAmount = paidAmount || invoice.paidAmount; // If no paid amount, keep existing one

        // Optionally, update the remaining balance if payment info is included
        if (paidAmount) {
            const remainingBalance = invoice.total - paidAmount;
            invoice.remainingBalance = remainingBalance >= 0 ? remainingBalance : 0;
        }

        // Save the updated invoice
        await invoice.save();
        console.log(invoice, 'invoice');

        // Return the updated invoice
        return NextResponse.json(invoice, { status: 200 });
    } catch (error) {
        console.error('Error updating invoice:', error);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 400 });
    }
}
