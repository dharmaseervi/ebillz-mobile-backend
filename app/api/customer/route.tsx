import customer from "@/model/customer";
import customerTransaction from "@/model/customerTransaction";
import Invoice from "@/model/invoice";
import User from "@/model/user";
import dbConnect from "@/utli/connectdb";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
    await dbConnect();

    try {
        const { fullName, email, phone, address, city, state, zip, clerkUserId, selectedCompanyId, openingBalance } = await request.json();
        if (!fullName || !email || !phone || !address || !city || !state || !zip) {
            return NextResponse.json({ success: false, error: 'Missing required fields' });
        }

        if (!clerkUserId) {
            return NextResponse.json({ success: false, error: "Clerk User ID is required" }, { status: 400 });
        }

        const user = await User.findOne({ clerkUserId });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        console.log(user._id, 'userr id');


        // Create a new customer instance
        const newCustomer = new customer({
            fullName,
            email,
            phone,
            address,
            city,
            state,
            zip,
            openingBalance,
            userId: user._id,
            selectedCompanyId
        });


        // Save the new customer to the database
        const savedCustomer = await newCustomer.save();

        await customerTransaction.create({
            customerId: newCustomer._id,
            date: new Date(),
            type: 'opening_balance', // or 'opening_balance'
            amount: openingBalance,
            balanceAfter: openingBalance,
            userId: user?._id,
            selectedCompanyId,
            reference: 'Opening Balance'
        });
        return NextResponse.json({ success: true, customer: savedCustomer });
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json({ success: false, error: 'Failed to create customer' });
    }
}

export async function GET(request: Request) {
    await dbConnect();

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const query = url.searchParams.get('query');
        const userId = url.searchParams.get('userId');
        const selectedCompanyId = url.searchParams.get('selectedCompanyId');

        if (!selectedCompanyId && !userId) {
            return NextResponse.json({ success: false, error: "CompanyId and userId are required " }, { status: 400 });
        }

        // Early return for single customer lookup
        if (id) {
            const customerData = await customer.findById(id);
            if (!customerData) {
                return NextResponse.json(
                    { success: false, error: 'Customer not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { success: true, customer: customerData },
                { status: 200 }
            );
        }

        // Build filter for multiple customers
        let filter: any = {};

        if (userId) {
            const user = await User.findOne({ clerkUserId: userId }).select("_id");
            if (!user) {
                return NextResponse.json(
                    { success: false, error: "User not found" },
                    { status: 404 }
                );
            }
            filter.userId = user._id;
        }

        if (selectedCompanyId) {
            if (!mongoose.Types.ObjectId.isValid(selectedCompanyId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid selectedCompanyId" },
                    { status: 400 }
                );
            }
            filter.selectedCompanyId = new mongoose.Types.ObjectId(selectedCompanyId);
        }

        if (query) {
            const regex = new RegExp(query, 'i');
            filter.$or = [
                { fullName: regex },
                { email: regex },
                { phone: regex },
                { city: regex }
            ];
        }

        // Fetch customers with the constructed filter
        const customers = await customer.find(filter)
            .sort({ fullName: 1 }) // Sort alphabetically by name
            .limit(100); // Add pagination limit

        if (!customers || customers.length === 0) {
            return NextResponse.json(
                { success: true, customers: [], message: "No customers found" },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { success: true, customers },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
// PUT: Update a customer
export async function PUT(request: Request) {
    await dbConnect();

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        console.log('id', id);


        const { fullName, email, phone, address, city, state, zip } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Customer ID is required" });
        }

        const updatedCustomer = await customer.findByIdAndUpdate(
            id,
            { fullName, email, phone, address, city, state, zip },
            { new: true, runValidators: true }
        );

        if (!updatedCustomer) {
            return NextResponse.json({ success: false, error: "Customer not found" });
        }

        return NextResponse.json({ success: true, customer: updatedCustomer });
    } catch (error) {
        console.error("Error updating customer:", error);
        return NextResponse.json({ success: false, error: "Failed to update customer" });
    }
}

// DELETE: Delete a customer
export async function DELETE(request: Request) {
    await dbConnect();

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "Customer ID is required" });
        }

        // Check for associated invoices
        const associatedInvoices = await Invoice.find({ customerId: id });

        if (associatedInvoices.length > 0) {
            return NextResponse.json({
                success: false,
                error: "Cannot delete customer with associated invoices.",
            });
        }

        // Delete the customer if no associations exist
        const deletedCustomer = await customer.findByIdAndDelete(id);

        if (!deletedCustomer) {
            return NextResponse.json({ success: false, error: "Customer not found" });
        }

        return NextResponse.json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
        console.error("Error deleting customer:", error);
        return NextResponse.json({ success: false, error: "Failed to delete customer" });
    }
}
