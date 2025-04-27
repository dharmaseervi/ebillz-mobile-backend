import Customer from "@/model/customer";
import customerTransaction from "@/model/customerTransaction";
import User from "@/model/user";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";
import mongoose from 'mongoose';

export async function POST(request: Request) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await dbConnect();

        // Validate request parameters
        const { clerkUserId, selectedCompanyId } = await request.json();
        const { searchParams } = new URL(request.url);
        const reversalTxnId = searchParams.get("id");
        console.log("Reversal Transaction ID:", reversalTxnId);
        console.log("Selected Company ID:", selectedCompanyId);
        console.log("Clerk User ID:", clerkUserId);
        
        if (!clerkUserId) {
            throw new Error('User ID is required');
        }
        if (!selectedCompanyId) {
            throw new Error('Company ID is required');
        }
        if (!reversalTxnId) {
            throw new Error('Transaction ID is required');
        }

        // Verify user exists
        const user = await User.findOne({ clerkUserId }).session(session);
        if (!user) {
            throw new Error('User not found');
        }

        // Get the reversal transaction with proper validation
        const reversalTxn = await customerTransaction
            .findById(reversalTxnId)
            .session(session);

            console.log("Reversal Transaction:", reversalTxn);
            
        if (!reversalTxn) {
            throw new Error('Transaction not found');
        }
        if (!reversalTxn.type.startsWith('reversal')) {
            throw new Error('Not a reversal transaction');
        }
    

        // Get the original transaction
        const originalTxn = await customerTransaction
            .findById(reversalTxn.originalTxnId)
            .session(session);

        if (!originalTxn) {
            throw new Error('Original transaction not found');
        }

        // Get customer with validation
        const customer = await Customer
            .findById(reversalTxn.customerId)
            .session(session);

        if (!customer) {
            throw new Error('Customer not found');
        }
        if (customer.selectedCompanyId.toString() !== selectedCompanyId) {
            throw new Error('Customer does not belong to selected company');
        }

        // Calculate balance changes
        const balanceChange = originalTxn.type === 'payment'
            ? -originalTxn.amount
            : originalTxn.amount;

        const newBalance = customer.currentBalance + balanceChange;

        // Update all records in a single transaction
        await reversalTxn.deleteOne({ session });

        originalTxn.reversed = false;
        originalTxn.reversalTxnId = null;
        await originalTxn.save({ session });

        customer.currentBalance = newBalance;
        customer.balanceType = newBalance >= 0 ? 'credit' : 'debit';
        await customer.save({ session });

        // Commit the transaction
        await session.commitTransaction();

        return NextResponse.json({
            success: true,
            message: "Reversal undone successfully",
            balance: newBalance,
            balanceDisplay: `${Math.abs(newBalance).toFixed(2)} ${newBalance >= 0 ? 'Cr' : 'Dr'}`,
            customerId: customer._id,
            originalTxnId: originalTxn._id,
        });

    } catch (err) {
        // Abort transaction on error
        await session.abortTransaction();

        console.error('Reversal Error:', err);

        const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to process reversal';

        return NextResponse.json(
            {
                success: false,
                error: errorMessage
            },
            { status: 500 }
        );
    } finally {
        // End the session
        session.endSession();
    }
}