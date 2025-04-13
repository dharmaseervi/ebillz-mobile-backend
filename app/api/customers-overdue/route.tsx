import customerTransaction from "@/model/customerTransaction";
import Invoice from "@/model/invoice";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const selectedCompanyId = searchParams.get("selectedCompanyId");
        const userId = searchParams.get("userId");

        if (!selectedCompanyId || !userId) {
            return NextResponse.json(
                { error: "selectedCompanyId and userId are required" },
                { status: 400 }
            );
        }

        // Find all unpaid invoices that are past due date with proper population
        const overdueInvoices = await Invoice.find({
            selectedCompanyId,
            status: { $in: ['unpaid', 'partial'] },
            dueDate: { $lt: new Date() }
        }).populate({
            path: 'customerId',
            select: 'fullName email phone city' // Explicitly select the fields you need
        });

        // Get all transactions for these customers
        const customerIds = overdueInvoices.map(inv => inv.customerId._id);
        console.log("Customer IDs:", customerIds);

        const transactions = await customerTransaction.find({
            selectedCompanyId,
            customerId: { $in: customerIds },
            type: { $in: ['opening_balance', 'invoice', 'payment'] }
        }).sort({ date: 1 });
        console.log("Transactions:", transactions);

        // Calculate current balances for each customer
        const customerBalances = {};

        // First pass: Process all transactions to calculate balances
        transactions.forEach(txn => {
            const custId = txn.customerId.toString();
            if (!customerBalances[custId]) {
                customerBalances[custId] = {
                    balance: 0,
                    customer: null, // Will be filled from invoices
                    overdueInvoices: []
                };
            }

            switch (txn.type) {
                case 'invoice':
                    customerBalances[custId].balance += txn.amount;
                    break;
                case 'payment':
                    customerBalances[custId].balance -= txn.amount;
                    break;
                case 'opening_balance':
                    customerBalances[custId].balance += txn.amount;
                    break;
            }
        });

        // Second pass: Associate invoices with customers and include customer details
        const customerMap = new Map();

        overdueInvoices.forEach(invoice => {
            const custId = invoice.customerId._id.toString();
            const dueAmount = invoice.total - (invoice.paidAmount || 0);

            if (dueAmount > 0 && customerBalances[custId]) {
                if (!customerMap.has(custId)) {
                    customerMap.set(custId, {
                        _id: invoice.customerId._id,
                        fullName: invoice.customerId.fullName,
                        email: invoice.customerId.email,
                        phone: invoice.customerId.phone,
                        city: invoice.customerId.city,
                        totalDue: customerBalances[custId].balance,
                        overdueInvoices: []
                    });
                }

                const customer = customerMap.get(custId);
                customer.overdueInvoices.push({
                    invoiceId: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.total,
                    dueAmount,
                    dueDate: invoice.dueDate,
                    daysOverdue: Math.floor((new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24))
                });
            }
        });

        // Convert map to array of customers
        const overdueCustomers = Array.from(customerMap.values())
            .filter(customer => customer.totalDue > 0)
            .map(customer => ({
                ...customer,
                overdueInvoices: customer.overdueInvoices
                    .sort((a, b) => a.daysOverdue - b.daysOverdue)
            }));

        return NextResponse.json(
            { customers: overdueCustomers },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching overdue customers:', error);
        return NextResponse.json(
            { error: "Failed to fetch overdue customers" },
            { status: 500 }
        );
    }
}