
import company from '@/model/company';
import dbConnect from '@/utli/connectdb';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    await dbConnect()

    try {
        const companyData = await request.json();
        const companyNew = new company({ ...companyData });
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
        const id = searchParams.get('id');

        let Company;
        if (id) {
            Company = await company.findOne({ _id: id });
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
        console.log(id ,'ids');
        

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

        const deletedCompany = await company.findOneAndDelete({ _id: id, userId });
        if (!deletedCompany) throw new Error('Company not found or not authorized');

        return NextResponse.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
        console.error('Error deleting company:', error);
        return NextResponse.json({ success: false, error: error || 'Error deleting company' });
    }
}
