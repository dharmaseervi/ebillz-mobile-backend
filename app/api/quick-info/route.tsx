import Invoice from '@/model/invoice';
import Payment from '@/model/payment';
import User from '@/model/user';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const dateFilter = searchParams.get('dateFilter') || 'today'; // "today" or "last7days"
        const clerkUserId = searchParams.get("userId");
        const selectedCompanyId = searchParams.get("selectedCompanyId");

        if (!clerkUserId || !selectedCompanyId) {
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Find user by Clerk User ID
        const user = await User.findOne({ clerkUserId }).select("_id");

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Date range calculation
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(todayStart.getDate() + 1);

        const last7DaysStart = new Date(todayStart);
        last7DaysStart.setDate(last7DaysStart.getDate() - 7);

        const dateRange =
            dateFilter === 'last7days'
                ? { $gte: last7DaysStart, $lt: tomorrowStart }
                : { $gte: todayStart, $lt: tomorrowStart };

        // Fetch Invoices (Filtered by company & date)
        const invoices = await Invoice.find({ 
            userId: user._id, 
            selectedCompanyId, 
            createdAt: dateRange 
        }).select("total");
        console.log(invoices);
        

        const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
        const numInvoices = invoices.length;

        // Fetch Payments (Filtered by company & date)
        const payments = await Payment.find({ 
            userId: user._id, 
            selectedCompanyId, 
            createdAt: dateRange 
        }).select("amountPaid");

        const totalPaymentsCollected = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);

        // Last 7 Days Collection (Grouped by Date)
        const last7DaysCollections = await Payment.aggregate([
            {
                $match: {
                    userId: user._id,
                    selectedCompanyId,
                    createdAt: { $gte: last7DaysStart, $lt: tomorrowStart },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    totalCollected: { $sum: '$amountPaid' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Pending Payments (Just Count Unpaid Invoices)
        const numPendingInvoices = await Invoice.countDocuments({ 
            userId: user._id, 
            selectedCompanyId, 
            status: 'unpaid' 
        });

        return NextResponse.json({
            numInvoices,
            totalInvoiceAmount,
            totalPaymentsCollected,
            last7DaysCollections,
            numPendingInvoices,
        });
    } catch (error) {
        console.error('Error fetching quick info:', error);
        return NextResponse.json({ error: 'Failed to fetch quick info' }, { status: 500 });
    }
}
