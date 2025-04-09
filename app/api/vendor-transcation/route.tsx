import User from '@/model/user';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';
import venoderTransaction from '@/model/venoderTransaction';
import Supplier from '@/model/supplier'; // Import your Supplier model

// Common error response handler
const handleError = (error: any, status: number = 500) => {
  console.error('Transaction Error:', error);
  return NextResponse.json({ 
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : null
  }, { status });
};

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("id");
    const { amount, mode, reference, clerkUserId, selectedCompanyId, type = 'payment' } = await request.json();

    // Validate inputs
    if (!supplierId) throw new Error('Supplier ID is required');
    if (!amount || amount <= 0) throw new Error('Invalid amount');
    if (!['payment', 'invoice'].includes(type)) throw new Error('Invalid transaction type');
    if (type === 'payment' && !mode) throw new Error('Payment mode is required');

    // Validate user and company access
    const user = await User.findOne({ clerkUserId });
    if (!user) throw new Error('User not found');
    
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) throw new Error('Supplier not found');
    if (supplier.selectedCompanyId.toString() !== selectedCompanyId) {
      throw new Error('Unauthorized company access');
    }

    // Calculate balance
    const lastTransaction = await venoderTransaction.findOne({ 
      vendor: supplierId, 
      selectedCompanyId 
    }).sort({ createdAt: -1 });

    const previousBalance = lastTransaction?.balanceAfter || supplier.openingBalance;
    const balanceChange = type === 'payment' ? -amount : amount;
    const newBalance = previousBalance + balanceChange;

    // Create transaction
    const txn = await venoderTransaction.create({
      vendor: supplierId,
      date: new Date(),
      type,
      amount,
      mode: type === 'payment' ? mode : undefined,
      reference,
      balanceAfter: newBalance,
      userId: user._id,
      selectedCompanyId,
    });

    // Update supplier's current balance
    await Supplier.findByIdAndUpdate(supplierId, { 
      currentBalance: newBalance,
      balanceType: newBalance >= 0 ? 'credit' : 'debit'
    });

    return NextResponse.json({ 
      success: true,
      transaction: {
        ...txn.toObject(),
        balanceDisplay: `${Math.abs(newBalance).toFixed(2)} ${newBalance >= 0 ? 'Cr' : 'Dr'}`
      }
    });

  } catch (err) {
    return handleError(err);
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const selectedCompanyId = searchParams.get("selectedCompanyId");
    const clerkUserId = searchParams.get("userId");

    // Validate inputs
    if (!id || !selectedCompanyId || !clerkUserId) {
      throw new Error('Missing required parameters');
    }

    // Verify user access
    const user = await User.findOne({ clerkUserId });
    if (!user) throw new Error('User not found');

    // Fetch transactions with pagination
    const page = parseInt(searchParams.get("page") || '1');
    const limit = parseInt(searchParams.get("limit") || '25');
    const skip = (page - 1) * limit;
    const [transactions, count] = await Promise.all([
      venoderTransaction.find({ vendor: id, selectedCompanyId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceRef', 'invoiceNumber date')
        .lean(),
        
      venoderTransaction.countDocuments({ vendor: id, selectedCompanyId })
    ]);

    return NextResponse.json({
      success: true,
      transactions: transactions.map(txn => ({
        ...txn,
        balanceDisplay: `${Math.abs(txn.balanceAfter).toFixed(2)} ${txn.balanceAfter >= 0 ? 'Cr' : 'Dr'}`
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (err) {
    return handleError(err);
  }
}