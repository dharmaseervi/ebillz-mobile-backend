import customer from "@/model/customer";
import Invoice from "@/model/invoice";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
    await dbConnect();

    try {
        const { fullName, email, phone, address, city, state, zip, userId } = await request.json();
        if (!fullName || !email || !phone || !address || !city || !state || !zip) {
            return NextResponse.json({ success: false, error: 'Missing required fields' });
        }

        // Create a new customer instance
        const newCustomer = new customer({
            fullName,
            email,
            phone,
            address,
            city,
            state,
            zip,
            userId
        });

        // Save the new customer to the database
        const savedCustomer = await newCustomer.save();

        return NextResponse.json({ success: true, customer: savedCustomer });
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json({ success: false, error: 'Failed to create customer' });
    }
}

export async function GET(request: Request) {
    await dbConnect();

    try {
        // Extract query parameters from the request
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const query = url.searchParams.get('query');

        if (id) {
            // Fetch a specific customer by ID
            const customerData = await customer.findById(id);
            if (!customerData) {
                return NextResponse.json({ success: false, error: 'Customer not found' });
            }
            return NextResponse.json({ success: true, customer: customerData });
        } else if (query) {
            // Search customers by query
            const regex = new RegExp(query, 'i'); // Case-insensitive search
            const customers = await customer.find({
                $or: [
                    { name: regex },
                    { email: regex },
                    { phone: regex }, // Assuming phone is a field
                ],
            });
            return NextResponse.json({ success: true, customers });
        } else {
            // Fetch all customers
            const customers = await customer.find({});
            return NextResponse.json({ success: true, customers });
        }
    } catch (error) {
        return NextResponse.json({ success: false });
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
 