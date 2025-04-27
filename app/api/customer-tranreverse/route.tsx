import Customer from "@/model/customer";
import customerTransaction from "@/model/customerTransaction";
import User from "@/model/user";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        await dbConnect();
        const { transactionId, clerkUserId, selectedCompanyId } = await request.json();

        const user = await User.findOne({ clerkUserId });
        if (!user) throw new Error('User not found');

        const originalTxn = await customerTransaction.findById(transactionId);
        if (!originalTxn) throw new Error('Transaction not found');

        if (originalTxn.selectedCompanyId.toString() !== selectedCompanyId) {
            throw new Error('Unauthorized company access');
        }

        if (originalTxn.isReversed) {
            throw new Error('Transaction already reversed');
        }

        const customer = await Customer.findById(originalTxn.customerId);
        if (!customer) throw new Error('Customer not found');

        const balanceChange = originalTxn.type === 'payment' ? originalTxn.amount : -originalTxn.amount;
        const newBalance = customer.currentBalance + balanceChange;

        // Create reversal transaction
        const reversalTxn = await customerTransaction.create({
            customerId: originalTxn.customerId,
            date: new Date(),
            type: `reversal_${originalTxn.type}`,
            amount: originalTxn.amount,
            reference: `Reversal of ${originalTxn.reference || originalTxn._id}`,
            balanceAfter: newBalance,
            userId: user._id,
            selectedCompanyId,
            originalTxnId: originalTxn._id,
        });

        // Mark original as reversed
        originalTxn.reversed = true;
        originalTxn.reversalTxnId = reversalTxn._id;
        await originalTxn.save();

        // Update customer's balance
        customer.currentBalance = newBalance;
        customer.balanceType = newBalance >= 0 ? 'credit' : 'debit';
        await customer.save();

        return NextResponse.json({
            success: true,
            reversal: {
                ...reversalTxn.toObject(),
                balanceDisplay: `${Math.abs(newBalance).toFixed(2)} ${newBalance >= 0 ? 'Cr' : 'Dr'}`
            }
        });

    } catch (err) {
        return console.error(err);
    }
}
