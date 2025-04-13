
import company from '@/model/company';
import User from '@/model/user';

import dbConnect from '@/utli/connectdb';
import { log } from 'console';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    await dbConnect()

    try {
        const { clerkUserId, ...companyData } = await request.json();

        if (!clerkUserId) {
            return NextResponse.json({ success: false, error: "Clerk User ID is required" }, { status: 400 });
        }

        console.log(companyData);


        // 🔍 Fetch MongoDB user using Clerk ID
        const user = await User.findOne({ clerkUserId });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // 🏢 Create new company with MongoDB user ID
        const companyNew = new company({
            ...companyData,
            userId: user._id, // Store MongoDB User ID
        });

        await companyNew.save();

        return NextResponse.json({ success: true, company: companyNew });
    } catch (error) {
        console.error('Error creating company:', error);
        return NextResponse.json({ success: false, error: error || 'Error creating company' });
    }
}

export async function GET(request: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const clerkUserId = searchParams.get('userId');
        const selectedCompanyId = searchParams.get("selectedCompanyId");
        console.log(selectedCompanyId, 'selected company id');

        // 🔍 Fetch user
        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }


        let companies;

        if (selectedCompanyId) {
            // 🔹 Get specific company by ID
            companies = await company.findOne({ _id: selectedCompanyId, userId: user._id });
            if (!companies) throw new Error("Company not found or not authorized");
        } else {
            // 🔹 Get all companies for the user
            companies = await company.find({ userId: user._id });
            if (!companies || companies.length === 0) {
                throw new Error("No companies found for this user");
            }
        }

        return NextResponse.json({ success: true, company: companies });
    } catch (error) {
        console.error('Error fetching company:', error);
        return NextResponse.json({ success: false, error: error.message || 'Error fetching company' });
    }
}

export async function PUT(request: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const companyData = await request.json();


        const updatedCompany = await company.findOneAndUpdate({ _id: id }, companyData, { new: true });
        if (!updatedCompany) throw new Error('Company not found or not authorized');



        return NextResponse.json({ success: true, company: updatedCompany });
    } catch (error) {
        console.error('Error updating company:', error);
        return NextResponse.json({ success: false, error: error || 'Error updating company' });
    }
}

export async function DELETE(request: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) throw new Error('Company ID is required');

        const deletedCompany = await company.findOneAndDelete({ _id: id });
        if (!deletedCompany) throw new Error('Company not found or not authorized');

        return NextResponse.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
        console.error('Error deleting company:', error);
        return NextResponse.json({ success: false, error: error || 'Error deleting company' });
    }
}
