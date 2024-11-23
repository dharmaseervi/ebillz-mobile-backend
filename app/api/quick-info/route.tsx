import Invoice from '@/model/invoice';
import Payment from '@/model/payment';
import dbConnect from '@/utli/connectdb';
import { NextResponse } from 'next/server';


export async function GET(request: Request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const dateFilter = searchParams.get('dateFilter') || 'today'; // "today" or "last7days"

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const last7DaysStart = new Date(todayStart);
        last7DaysStart.setDate(last7DaysStart.getDate() - 7);

        // Date range for filtering
        const dateRange =
            dateFilter === 'last7days'
                ? { $gte: last7DaysStart, $lte: todayStart }
                : { $gte: todayStart };

        // Fetch data from Invoice collection
        const invoices = await Invoice.find({ createdAt: dateRange });
        const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
        const numInvoices = invoices.length;

        // Fetch data from Payment collection
        const payments = await Payment.find({ createdAt: dateRange });
        const totalPaymentsCollected = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);

        // Last 7 days collections (group by date)
        const last7DaysCollections = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: last7DaysStart },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    totalCollected: { $sum: '$amountPaid' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Pending payments (unpaid invoices)
        const pendingPayments = await Invoice.find({ status: 'unpaid' });

        return NextResponse.json({
            numInvoices,
            totalInvoiceAmount,
            totalPaymentsCollected,
            last7DaysCollections,
            numPendingInvoices: pendingPayments.length,
        });
    } catch (error) {
        console.error('Error fetching quick info:', error);
        return NextResponse.json({ error: 'Failed to fetch quick info' }, { status: 500 });
    }
}
