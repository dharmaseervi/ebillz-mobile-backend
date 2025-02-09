import Invoice from "@/model/invoice";
import User from "@/model/user";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    await dbConnect();
    
    try {
        const { searchParams } = new URL(request.url);
        const clerkUserId = searchParams.get("userId");
        const selectedCompanyId = searchParams.get("selectedCompanyId");

        if (!clerkUserId || !selectedCompanyId) {
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Find user by Clerk User ID
        const user = await User.findOne({ clerkUserId }).select("_id");

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const limit = parseInt(searchParams.get("limit") || "5", 10);

        // Fetch invoices only for this user
        const recentInvoices = await Invoice.find({
            userId: user._id,
            selectedCompanyId,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({
                path: "customerId",
                select: "fullName email phone",
            })
            .populate({
                path: "items.itemId",
                select: "name price",
            })
            .select("invoiceNumber invoiceDate createdAt total customerId items");

        return NextResponse.json({ success: true, data: recentInvoices }, { status: 200 });

    } catch (error) {
        console.error("Error fetching invoices:", error.message);
        return NextResponse.json(
            { success: false, error: "Failed to fetch invoices" },
            { status: 500 }
        );
    }
}
