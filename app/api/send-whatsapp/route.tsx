import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utli/connectdb";
import Invoice from "@/model/invoice";
import htmlToPdf from "html-pdf-node";
import Customer from "@/model/customer";
import company from "@/model/company";
import bank from "@/model/bank";
import ProductDocument from "@/model/item";
// 🔹 AWS S3 Config
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEYS!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const uploadToS3 = async (pdfBuffer: Buffer, fileName: string) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: `invoices/${fileName}`,
            Body: pdfBuffer,
            ContentType: "application/pdf",

        };

        await s3Client.send(new PutObjectCommand(params));

        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/invoices/${fileName}`;
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw error;
    }
};


export async function POST(req: NextRequest) {
    try {
        const { invoiceId } = await req.json();

        if (!invoiceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const invoice = await Invoice.findById(invoiceId).lean();
        const customer = await Customer.findById(invoice.customerId);
        const companyDetails = await company.findById(invoice.selectedCompanyId);
        const companyBankDetails = await bank.findOne({ companyId: invoice.selectedCompanyId });
        const product = await ProductDocument.find({
            _id: { $in: invoice.items.map(item => item.itemId) }
        });

        const invoiceHtml = generateInvoiceHTML(invoice, companyDetails, companyBankDetails, customer, product);
        // 🔹 Generate PDF (Assuming you already have `generatePdf` function)
        const pdfBuffer = await generatePdf(invoiceHtml);

        const tempFilePath = path.join("/tmp", `invoice-${invoiceId}.pdf`);

        fs.writeFileSync(tempFilePath, pdfBuffer);

        // 🔹 Upload to S3
        const pdfUrl = await uploadToS3(pdfBuffer, `invoice-${invoiceId}.pdf`);

        // 🔹 Send WhatsApp Message
        const whatsappUrl = `https://wa.me/?text=Hello, your invoice is ready. Download it here: ${pdfUrl}`;

        return NextResponse.json({ success: true, pdfUrl, whatsappUrl });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Failed to process invoice" }, { status: 500 });
    }
}

async function generatePdf(html: string) {
    const file = { content: html };
    const options = { format: "A4" };
    return await htmlToPdf.generatePdf(file, options);
}


function generateInvoiceHTML(invoice: any, companyDetails: any, companyBankDetails: any, customer: any, product: any) {
    if (!invoice) return '';

    const items = invoice.items || [];

    // Calculate total, CGST, SGST, and Grand Total
    let total = 0;
    let cgst = 0;
    let sgst = 0;

    items.forEach(item => {
        const itemSubtotal = item.sellingPrice * item.quantity;
        total += itemSubtotal;
        cgst += itemSubtotal * 0.09; // 9% CGST
        sgst += itemSubtotal * 0.09; // 9% SGST
    });

    const grandTotal = total + cgst + sgst;


    const updatedItems = invoice.items.map(item => {
        const products = product.find(prod => prod._id.toString() === item.itemId.toString());
        console.log(item, 'products');

        return {
            ...item, // Keep sellingPrice, quantity from invoice items
            product: products || {} // Add product details
        };
    });

    return `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              color: #374151;
              background-color: #f3f4f6;
            }
            .invoice-container {
              background-color: #ffffff;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 30mm 20mm;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
            }
            .brand-header {
              display: flex;
              align-items: center;
            }
            .brand-logo {
              width: 60px;
              height: 60px;
              background-color: #4f46e5;
              border-radius: 12px;
              margin-right: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 24px;
              font-weight: bold;
            }
            .brand-name {
              font-size: 28px;
              font-weight: bold;
              color: #4f46e5;
            }
            .invoice-details {
              text-align: right;
            }
            .invoice-details h2 {
              font-size: 40px;
              font-weight: 700;
              color: #4f46e5;
              margin: 0 0 8px;
            }
            .invoice-details div {
              margin-bottom: 4px;
              color: #6b7280;
            }
            .company-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
            }
            .company-details div {
              font-size: 14px;
              line-height: 1.5;
            }
            .company-details strong {
              display: block;
              font-size: 16px;
              margin-bottom: 8px;
              color: #111827;
            }
            .table-container {
              margin-bottom: 40px;
            }
            .invoice-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
            }
            .invoice-table th, .invoice-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .invoice-table th {
              background-color: #f9fafb;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.05em;
              color: #6b7280;
            }
            .invoice-table tr:last-child td {
              border-bottom: none;
            }
            .invoice-totals {
              text-align: right;
              margin-top: 20px;
            }
            .invoice-totals div {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 8px;
            }
            .invoice-totals span:first-child {
              width: 100px;
              text-align: left;
              margin-right: 20px;
              color: #6b7280;
            }
            .invoice-totals .grand-total {
              font-weight: 700;
              font-size: 18px;
              color: #4f46e5;
              border-top: 2px solid #e5e7eb;
              padding-top: 8px;
            }
            .footer {
              margin-top: 60px;
              font-size: 14px;
              color: #6b7280;
            }
            .bank {
              margin-top: 20px;
              padding: 16px;
              background-color: #f9fafb;
              border-radius: 8px;
            }
            .bank strong {
              display: block;
              margin-bottom: 8px;
              color: #111827;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header -->
            <div class="invoice-header">
              <div class="brand-header">
            
                <div class="brand-name">${companyDetails?.companyName}</div>
              </div>
              <div class="invoice-details">
                <h2>INVOICE</h2>
                <div><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
              </div>
            </div>
  
            <!-- Company Details -->
            <div class="company-details">
              <div>
                <strong>From</strong>
                ${companyDetails?.companyName}<br>
                ${companyDetails?.address}, ${companyDetails?.city}, ${companyDetails?.zip}<br>
                ${companyDetails?.gstNumber}<br>
                ${companyDetails?.email}<br>
                ${companyDetails?.contactNumber}
              </div>
              <div>
                <strong>Bill To</strong>
                ${customer.fullName || 'N/A'}<br>
                ${customer.address || 'N/A'}<br>
                ${customer.city || 'N/A'}, ${customer.state || 'N/A'}<br>
                Phone: ${customer.phone || 'N/A'}
              </div>
            </div>
  
            <!-- Invoice Table -->
            <div class="table-container">
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Details</th>
                    <th>HSN Code</th>
                    <th>Price</th>
                    <th>Qty.</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                ${updatedItems.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.product?.name || 'N/A'}</td>
        <td>${item.product?.hsnCode || 'N/A'}</td>
        <td>₹${item.sellingPrice?.toFixed(2)}</td>  <!-- From invoice item -->
        <td>${item.quantity}</td>  <!-- From invoice item -->
        <td>₹${(item.sellingPrice * item.quantity)?.toFixed(2)}</td> <!-- Calculation -->
      </tr>
    `).join('')}
                
                </tbody >
              </table >
            </div >
  
            <div class="invoice-totals">
              <div>
                <span>Subtotal:</span>
                <span>₹${total.toFixed(2)}</span>
              </div>
              <div>
                <span>CGST (9%):</span>
                <span>₹${cgst.toFixed(2)}</span>
              </div>
              <div>
                <span>SGST (9%):</span>
                <span>₹${sgst.toFixed(2)}</span>
              </div>
              <div class="grand-total">
                <span>Grand Total:</span>
                <span>₹${grandTotal.toFixed(2)}</span>
              </div>
            </div>
  
            <!--Footer -->
    <div class="footer">
        <div>${companyDetails?.companyName}</div>
        <div>${companyDetails?.address}</div>
        <div>${companyDetails?.contactNumber}</div>
        <div class="bank">
            <strong>Bank Details:</strong>
            Bank: ${companyBankDetails?.bankName || 'N/A'}<br>
                Account Number: ${companyBankDetails?.accountNumber || 'N/A'}<br>
                    IFSC Code: ${companyBankDetails?.ifscCode || 'N/A'}<br>
                        Branch: ${companyBankDetails?.accountName || 'N/A'}
                    </div>
                </div>
        </div>
    </body>
      </html >
        `;
}
