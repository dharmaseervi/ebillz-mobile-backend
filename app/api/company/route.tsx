
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



        // 🔍 Fetch MongoDB user using Clerk ID
        const user = await User.findOne({ clerkUserId });
        console.log(user._id);

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        let Company;
        if (user._id) {
            Company = await company.find({ userId: user._id });
            if (!company) throw new Error('Company not found or not authorized');
        } else {
            Company = await company.find({});
        }

        return NextResponse.json({ success: true, Company });
    } catch (error) {
        console.error('Error fetching company:', error);
        return NextResponse.json({ success: false, error: error || 'Error fetching company' });
    }
}

export async function PUT(request: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const companyData = await request.json();
        console.log(id, 'idssss');


        const updatedCompany = await company.findOneAndUpdate({ _id: id }, companyData, { new: true });
        if (!updatedCompany) throw new Error('Company not found or not authorized');

        console.log(updatedCompany);
        

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
