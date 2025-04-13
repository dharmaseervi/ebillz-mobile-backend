import Bank from "@/model/bank";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";

// POST request handler to create new bank details
export async function POST(request: Request) {
    try {
        // Establish database connection
        await dbConnect();

        // Parse the incoming request body
        const { accountName, accountNumber, ifscCode, bankName, companyId, userId } = await request.json();
        console.log(companyId, 'companu id');

        // Validate required fields
        if (!accountName || !accountNumber || !ifscCode || !bankName) {
            return NextResponse.json({ message: 'All fields are required' });
        }

        // Create new bank details entry
        const newBankDetails = new Bank({
            accountName,
            accountNumber,
            ifscCode,
            bankName,
            companyId: companyId || '',
            userId
        });
        console.log(newBankDetails);

        // Save the bank details to the database
        const savedBankDetails = await newBankDetails.save();

        // Respond with the created bank details
        return NextResponse.json(savedBankDetails);
    } catch (error) {
        console.error('Error creating bank details:', error);
        return NextResponse.json(error);
    }
}

// GET request handler to fetch all bank details
export async function GET(request: Request) {
    try {
        // Establish database connection
        await dbConnect();

        // Extract company ID from query parameters
        const { searchParams } = new URL(request.url);
        const clerkUserId = searchParams.get('userId');
        const selectedCompanyId = searchParams.get('selectedCompanyId');

        if (!selectedCompanyId) {
            return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
        }

        // Fetch bank details using the company ID
        const bankDetails = await Bank.findOne({ selectedCompanyId });

        if (!bankDetails) {
            return NextResponse.json({ message: 'No bank details found for this company ID' }, { status: 404 });
        }

        // Respond with the fetched bank details
        console.log(bankDetails);
        return NextResponse.json(bankDetails);

    } catch (error) {
        console.error('Error fetching bank details:', error);
        return NextResponse.json({ message: 'Failed to fetch bank details', error: error }, { status: 500 });
    }
}

// PUT request handler to update bank details
export async function PUT(request: Request) {
    try {
        // Establish database connection
        await dbConnect();

        // Parse the incoming request body
        const { companyId, accountName, accountNumber, ifscCode, bankName } = await request.json();
        console.log(companyId, 'com id');

        // Validate required fields
        if (!companyId) {
            return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
        }

        // Find existing bank details for the company
        const existingBankDetails = await Bank.findOne({ companyId });

        if (!existingBankDetails) {
            return NextResponse.json({ message: 'Bank details not found for this company' }, { status: 404 });
        }

        // Update fields if provided
        if (accountName) existingBankDetails.accountName = accountName;
        if (accountNumber) existingBankDetails.accountNumber = accountNumber;
        if (ifscCode) existingBankDetails.ifscCode = ifscCode;
        if (bankName) existingBankDetails.bankName = bankName;

        // Save updated bank details
        const updatedBankDetails = await existingBankDetails.save();

        // Respond with the updated bank details
        return NextResponse.json(updatedBankDetails);
    } catch (error) {
        console.error('Error updating bank details:', error);
        return NextResponse.json({ message: 'Failed to update bank details', error: error }, { status: 500 });
    }
}
