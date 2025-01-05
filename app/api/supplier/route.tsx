import Supplier from '@/model/supplier'; // Use capitalized convention for models
import dbConnect from '@/utli/connectdb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        // Destructure fields from request body
        const { name, userId, email, phone, address, city, state, gst } = await req.json();
        console.log(userId);

        // Create a new supplier document
        const newSupplier = new Supplier({
            name,
            userId,
            email,
            phone,
            address,
            city,
            state,
            gst,
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
        const id = searchParams.get('id');

        if (id) {          
            // Fetch supplier by ID
            const supplier = await Supplier.findById(id);
            if (!supplier) {
                return NextResponse.json(
                    { error: 'Supplier not found' },
                    { status: 404 }
                );
            }

            console.log('Supplier:', supplier);
            
            return NextResponse.json(supplier, { status: 200 });
        } else {
            // Fetch all suppliers
            const suppliers = await Supplier.find({});
            return NextResponse.json(suppliers, { status: 200 });
        }
    } catch (error) {
        console.error('Error fetching suppliers:', error);

        return NextResponse.json(
            {
                error: 'Error fetching suppliers',
                message: error,
            },
            { status: 500 }
        );
    }
}
