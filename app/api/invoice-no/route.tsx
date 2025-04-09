import Counter from "@/model/counter"; // Make sure to import Counter
import User from "@/model/user";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    await dbConnect();
    
    try {
        const { searchParams } = new URL(request.url);
        const clerkUserId = searchParams.get("clerkUserId");
        const selectedCompanyId = searchParams.get("selectedCompanyId");

        if (!clerkUserId || !selectedCompanyId) {
            return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
        }

        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Get the current counter value
        const counter = await Counter.findOne({
            userId: user._id,
            selectedCompanyId
        });

        // If no counter exists yet, next number is 1, otherwise current value + 1
        const nextInvoiceNumber = counter ? counter.sequenceValue + 1 : 1;

        return NextResponse.json({ 
            success: true, 
            invoiceNumber: nextInvoiceNumber 
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching invoice number:", error.message);
        return NextResponse.json({ 
            success: false, 
            error: "Failed to retrieve invoice number" 
        }, { status: 500 });
    }
}