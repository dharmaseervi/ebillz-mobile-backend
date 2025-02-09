import Supplier from '@/model/supplier'; // Use capitalized convention for models
import User from '@/model/user';
import dbConnect from '@/utli/connectdb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        // Destructure fields from request body
        const { name, email, phone, address, city, state, gst, clerkUserId, selectedCompanyId } = await req.json();

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
        // Create a new supplier document
        const newSupplier = new Supplier({
            name,
            email,
            phone,
            address,
            city,
            state,
            gst,
            userId: user?._id,
            selectedCompanyId
        });
        console.log('New Supplier:', newSupplier);

        // Save the document to the database
        const savedSupplier = await newSupplier.save();

        // Return the saved document as the response
        return NextResponse.json(savedSupplier, { status: 201 });
    } catch (error) {
        console.error('Error creating supplier:', error);
        return NextResponse.json({ error: 'Error creating supplier', details: error }, { status: 400 });
    }
}


export async function GET(request: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
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

        if (id) {
            // Fetch supplier by ID and ensure it belongs to the user & company
            const supplier = await Supplier.findOne({ _id: id, userId: user._id, selectedCompanyId });
            if (!supplier) {
                return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
            }

            return NextResponse.json(supplier, { status: 200 });
        } else {
            // Fetch all suppliers for this user and company
            const suppliers = await Supplier.find({ userId: user._id, selectedCompanyId });
            return NextResponse.json(suppliers, { status: 200 });
        }
    } catch (error) {
        console.error("Error fetching suppliers:", error);

        return NextResponse.json({ error: "Error fetching suppliers", details: error }, { status: 500 });
    }
}
