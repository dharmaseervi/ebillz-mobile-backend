import customer from "@/model/customer";
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
        console.log(id,'customet id we got ');

        if (id) {
            // Fetch a specific customer by ID
            const customerData = await customer.findById(id);
            if (!customerData) {
                return NextResponse.json({ success: false, error: 'Customer not found' });
            }
            console.log(customer);
            return NextResponse.json({ success: true, customer: customerData });
        } else {
            // Fetch all customers
            const customers = await customer.find({});
            return NextResponse.json({ success: true, customers });
        }
      
        
    } catch (error) {
        console.error('Error fetching customer data:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch customer data' });
    }
}