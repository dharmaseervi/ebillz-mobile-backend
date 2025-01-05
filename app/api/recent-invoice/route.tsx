import Invoice from "@/model/invoice";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '5'); // Default limit to 10 if not provided

        // Fetch the most recent invoices, sorted by date (descending)
        const recentInvoices = await Invoice.find()
            .sort({ createdAt: -1 }) // Sort by most recent
            .limit(limit) // Limit the number of results
            ?.populate('customerId') // Populate customer details
            .populate('items.itemId'); // Populate item details

        return NextResponse.json(recentInvoices, { status: 200 });
    } catch (error) {
        console.error('Error fetching recent invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch recent invoices' }, { status: 400 });
    }
}
