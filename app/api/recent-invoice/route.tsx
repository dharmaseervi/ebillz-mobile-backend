import Customer from "@/model/customer";
import Invoice from "@/model/invoice";
import User from "@/model/user";
import dbConnect from "@/utli/connectdb";
import mongoose from "mongoose";
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

        console.log("Registered Models:", mongoose.modelNames());

        const limit = parseInt(searchParams.get("limit") || "5", 10);

        // Fetch invoices only for this user
        const recentInvoices = await Invoice.find({
            userId: user._id,
            selectedCompanyId,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("invoiceNumber invoiceDate createdAt total customerId items");

        // ✅ Fetch customer details separately
        const customerIds = recentInvoices.map((invoice) => invoice.customerId);

        // Fetch customers in a single query
        const customers = await Customer.find({ _id: { $in: customerIds } })
            .select("fullName email phone")
            .lean();

        // Create a map of customer details
        const customerMap = customers.reduce((acc, customer) => {
            acc[customer._id.toString()] = customer;
            return acc;
        }, {} as Record<string, any>);

        // Attach customer details to invoices
        const invoicesWithCustomer = recentInvoices.map((invoice) => ({
            ...invoice.toObject(),
            customer: customerMap[invoice.customerId.toString()] || null,
        }));

        return NextResponse.json({ success: true, data: invoicesWithCustomer }, { status: 200 });

    } catch (error) {
        console.error("Error fetching invoices:", error.message);
        return NextResponse.json(
            { success: false, error: "Failed to fetch invoices" },
            { status: 500 }
        );
    }
}
