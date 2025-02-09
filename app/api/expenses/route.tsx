// app/api/expenses/route.ts
import expenses from '@/model/expenses';
import User from '@/model/user';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';


export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { date, category, amount, reference, notes, selectedCompanyId, clerkUserId } = body;
        console.log(clerkUserId , selectedCompanyId);

        if (!date || !category || !amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

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
        const Expense = await expenses.create({
            date,
            category,
            amount,
            reference,
            notes,
            userId: user._id,
            selectedCompanyId
        });

        return NextResponse.json({ success: true, Expense }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error },
            { status: 500 }
        );
    }
}


export async function GET(request: Request) {
    try {
        await dbConnect();

        // Extract parameters from the request URL
        const { searchParams } = new URL(request.url);
        const clerkUserId = searchParams.get("userId");
        const selectedCompanyId = searchParams.get("selectedCompanyId");
        console.log(clerkUserId, 'get clerk user id');

        if (!clerkUserId || !selectedCompanyId) {
            return NextResponse.json(
                { success: false, error: "clerkUserId and selectedCompanyId are required" },
                { status: 400 }
            );
        }
        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch expenses based on the user and company
        const Expenses = await expenses.find({ userId: user._id, selectedCompanyId });

        return NextResponse.json({ success: true, Expenses }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
