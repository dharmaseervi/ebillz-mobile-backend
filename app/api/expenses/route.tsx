// app/api/expenses/route.ts
import expenses from '@/model/expenses';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';


export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { date, category, amount, reference, notes } = body;

        if (!date || !category || !amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const Expense = await expenses.create({
            date,
            category,
            amount,
            reference,
            notes,
        });

        return NextResponse.json({ success: true, Expense }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error },
            { status: 500 }
        );
    }
}


export async function GET() {
    try {
        await dbConnect();

        const Expenses = await expenses.find()
        return NextResponse.json({ success: true, Expenses }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error },
            { status: 500 }
        );
    }
}
