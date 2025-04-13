import Invoice from '@/model/invoice';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';
import ProductDocument from "@/model/item";
import mongoose from 'mongoose';
import User from '@/model/user';
import Customer from '@/model/customer';
import counter from '@/model/counter';
import customerTransaction from '@/model/customerTransaction';


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
            clerkUserId,
            selectedCompanyId
        } = await request.json();

        if (!clerkUserId) {
            return NextResponse.json({ success: false, error: "Clerk User ID is required" }, { status: 400 });
        }

        const user = await User.findOne({ clerkUserId });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        if (!selectedCompanyId) {
            return NextResponse.json({ success: false, error: "Selected company ID is required" }, { status: 400 });
        }

        const Counter = await counter.findOneAndUpdate(
            { userId: user._id, selectedCompanyId },
            { $inc: { sequenceValue: 1 } },
            { new: true, upsert: true, session }
        );

        // Create the new invoice
        const newInvoice = new Invoice({
            invoiceNumber: Counter.sequenceValue,
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
            userId: user._id,
            selectedCompanyId
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
                throw new Error(`Item with ID ${itemId} not found`);
            }

            if (existingItem.quantity < quantity) {
                throw new Error(`Insufficient stock for product ID ${itemId}`);
            }

            existingItem.quantity -= quantity;
            await existingItem.save({ session });
        }

        const lastTxn = await customerTransaction.findOne({ customerId, selectedCompanyId }).sort({ createdAt: -1 });

        const previousBalance = lastTxn?.balanceAfter || 0;
        const newBalance = previousBalance + total;

        await customerTransaction.create({
            customerId,
            type: 'invoice',
            amount: total, // <--- Fix this
            invoiceRef: newInvoice._id,
            balanceAfter: newBalance,
            userId: user._id,
            selectedCompanyId,
        });


        // Commit the transaction
        await session.commitTransaction();

        return NextResponse.json(newInvoice, { status: 200 });
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
        const clerkUserId = searchParams.get("userId");
        const selectedCompanyId = searchParams.get("selectedCompanyId");

        if (!clerkUserId) {
            return NextResponse.json({ error: "Unauthorized: User ID missing" }, { status: 401 });
        }

        // Fetch user details
        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!selectedCompanyId) {
            return NextResponse.json({ error: "Selected company ID is required" }, { status: 400 });
        }



        // Fetch by ID if provided
        if (id) {
            const invoice = await Invoice.findOne({ _id: id, selectedCompanyId }).populate("items.itemId");

            console.log(invoice, "Invoice by ID:", id);


            if (!invoice) {
                return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
            }

            // Fetch the customer separately using invoice.customerId
            const customer = await Customer.findById(invoice.customerId);

            console.log(customer, "Customer by ID:", invoice.customerId);


            return NextResponse.json({ ...invoice.toObject(), customer }, { status: 200 });
        }


        // Initialize the base filter
        const filter: any = { userId: user._id, selectedCompanyId };

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
                    .populate("items.itemId")
                    .lean();
            } else if (regexFilter) {
                // Match customer fullName or email
                const allInvoices = await Invoice.find(filter)
                    .populate("customerId")
                    .populate("items.itemId")
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
                .populate("items.itemId")
                .lean();
        }

        return NextResponse.json(invoices, { status: 200 });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }
}




export async function PATCH(request: Request) {
    await dbConnect();
    try {
        const { _id, status } = await request.json();


        // Find the invoice by its ID
        const invoice = await Invoice.findById(_id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        invoice.status = status// Mark the invoice as paid
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
            clerkUserId,
            selectedCompanyId, // Ensure invoice is updated for the correct company
        } = await request.json();

        console.log("Update Request - Invoice ID:", _id, "Company ID:", selectedCompanyId);

        if (!clerkUserId) {
            return NextResponse.json({ success: false, error: "Clerk User ID is required" }, { status: 400 });
        }

        if (!selectedCompanyId) {
            return NextResponse.json({ success: false, error: "Company ID is required" }, { status: 400 });
        }

        // Find the user
        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Find the invoice and ensure it belongs to the user and company
        const invoice = await Invoice.findOne({ _id, userId: user._id, selectedCompanyId });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found or unauthorized access" }, { status: 404 });
        }

        // Update invoice fields only if provided in the request
        invoice.invoiceDate = invoiceDate ?? invoice.invoiceDate;
        invoice.dueDate = dueDate ?? invoice.dueDate;
        invoice.orderNumber = orderNumber ?? invoice.orderNumber;
        invoice.salesperson = salesperson ?? invoice.salesperson;
        invoice.customerId = customerId ?? invoice.customerId;
        invoice.items = items ?? invoice.items;
        invoice.subtotal = subtotal ?? invoice.subtotal;
        invoice.discount = discount ?? invoice.discount;
        invoice.cgst = cgst ?? invoice.cgst;
        invoice.sgst = sgst ?? invoice.sgst;
        invoice.tax = tax ?? invoice.tax;
        invoice.total = total ?? invoice.total;
        invoice.status = status ?? invoice.status;
        invoice.paymentMethod = paymentMethod ?? invoice.paymentMethod;
        invoice.paymentDetails = paymentDetails ?? invoice.paymentDetails;
        invoice.paidAmount = paidAmount ?? invoice.paidAmount;

        // Ensure paidAmount and remainingBalance are properly calculated
        if (typeof paidAmount === "number") {
            invoice.remainingBalance = Math.max(invoice.total - paidAmount, 0);
        }

        // Save the updated invoice
        await invoice.save();

        console.log("Updated Invoice:", invoice);

        // Return the updated invoice
        return NextResponse.json(invoice, { status: 200 });
    } catch (error) {
        console.error("Error updating invoice:", error);
        return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
        }

        // Find the invoice by ID
        const invoice = await Invoice.findById(id).session(session);

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Rollback stock for each item in the invoice
        for (const item of invoice.items) {
            const { itemId, quantity } = item;

            // Validate ObjectId
            if (!mongoose.isValidObjectId(itemId)) {
                console.warn(`Invalid ObjectId for itemId: ${itemId}`);
                continue;
            }

            const existingItem = await ProductDocument.findById(itemId).session(session);

            if (!existingItem) {
                // Log the missing item and continue the rollback for others
                console.warn(`Item with ID ${itemId} not found during stock rollback.`);
                continue;
            }

            existingItem.quantity += quantity;
            await existingItem.save({ session });
        }

        // Delete the invoice
        await Invoice.findByIdAndDelete(id, { session });

        // Commit the transaction
        await session.commitTransaction();

        return NextResponse.json({ message: 'Invoice deleted successfully' }, { status: 200 });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error deleting invoice:', error.message);
        return NextResponse.json({ error: error.message || 'Failed to delete invoice' }, { status: 400 });
    } finally {
        session.endSession();
    }
}