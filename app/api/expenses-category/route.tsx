import Category from "@/model/expensesCategory";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";

export  async function POST(request: Request) {
    try {
        await dbConnect();

        const { name } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Category name is required' });
        }

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return NextResponse.json({ error: 'Category already exists' });
        }

        const category = new Category({ name });
        await category.save();

        return NextResponse.json({ message: 'Category created successfully', category });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const categories = await Category.find()
        return NextResponse.json({ categories });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch categories' });
    }
}
