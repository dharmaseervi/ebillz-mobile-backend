import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utli/connectdb';
import Invoice from '@/model/invoice';
import Customer from '@/model/customer';
import company from '@/model/company';
import bank from '@/model/bank';
import htmlToPdf from "html-pdf-node";
import ProductDocument from "@/model/item";

const resend = new Resend(process.env.RESEND_API_KEY);


export async function POST(req: NextRequest) {

    try {
        const { invoiceId } = await req.json();

        if (!invoiceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect(); // Ensure DB connection

        // 🔍 Fetch invoice data from DB
        const invoice = await Invoice.findById(invoiceId).lean();
        const customer = await Customer.findById(invoice.customerId);
        const companyDetails = await company.findById(invoice.selectedCompanyId);
        const companyBankDetails = await bank.findOne({ companyId: invoice.selectedCompanyId });
        const product = await ProductDocument.find({
            _id: { $in: invoice.items.map(item => item.itemId) }
        });
        
        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // 📝 Generate invoice HTML (Replace this with your actual template logic)
        const invoiceHtml = generateInvoiceHTML(invoice, companyDetails, companyBankDetails, customer, product);

        // 📄 Convert HTML to PDF
        const pdfBuffer = await generatePdf(invoiceHtml);

        const grandTotal = invoice.items.reduce((total, item) => total + item.price * item.quantity, 0);

        // Generate Email HTML
        const emailHtml = EmailTemplate({
            companyName: companyDetails?.companyName || "Your Company",
            customerName: customer?.fullName || "Valued Customer",
            invoiceNumber: invoice?.invoiceNumber || "N/A",
            invoiceDate: invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "N/A",
            invoiceTotal: grandTotal.toFixed(2),
            invoiceDownloadUrl: `https://easyinvoicepro.in/invoice/${invoice._id}`,
            currentYear: new Date().getFullYear().toString(),
        });


        // 📩 Send email with PDF attachment
        const emailResponse = await resend.emails.send({
            from: "ebillz@easyinvoicepro.in",
            to: 'dharmaseervijb18239@gmail.com', // Dynamic customer email
            subject: `Invoice #${invoice.invoiceNumber} from ${companyDetails.companyName}`,
            html: emailHtml,
            attachments: [
                {
                    filename: `Invoice-${invoice.invoiceNumber}.pdf`,
                    content: pdfBuffer.toString("base64"),
                    contentType: "application/pdf",
                },
            ],
        });

        return NextResponse.json({ success: true, emailResponse });
    } catch (error) {
        console.error("Error sending invoice:", error);
        return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 });
    }
}

// Function to generate PDF from HTML
async function generatePdf(html: string) {
    const file = { content: html };
    const options = { format: "A4" };
    return await htmlToPdf.generatePdf(file, options);
}


// 🏗️ Replace this function with your actual invoice template
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


    console.log(updatedItems, 'updatedItems');



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

function EmailTemplate({ companyName, customerName, invoiceNumber, invoiceDate, invoiceTotal, invoiceDownloadUrl, currentYear }) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Invoice from ${companyName}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #ffffff;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e0e0e0;
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #eeeeee;
        }
        .header img {
          max-width: 120px;
        }
        .header h1 {
          font-size: 22px;
          margin: 10px 0;
          color: #222;
        }
        .content {
          padding: 20px;
          font-size: 16px;
          line-height: 1.6;
        }
        .content strong {
          color: #222;
        }
        .invoice-details {
          background: #f4f4f4;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          font-size: 15px;
        }
        .invoice-details p {
          margin: 6px 0;
        }
        .cta-button {
          display: block;
          text-align: center;
          background: #4f46e5;
          color: #ffffff;
          padding: 12px;
          text-decoration: none;
          font-size: 16px;
          font-weight: bold;
          border-radius: 6px;
          margin-top: 20px;
          transition: 0.3s;
        }
        .cta-button:hover {
          background: #3730a3;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #777;
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #eeeeee;
        }
        .footer a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice from ${companyName}</h1>
        </div>
        
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We hope you're doing well! Your invoice details are below:</p>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p><strong>Amount:</strong> ₹${invoiceTotal}</p>
          </div>
    
          <p>Your invoice is attached for reference. If you have any questions, feel free to reach out to us.</p>
    
          <a href="${invoiceDownloadUrl}" class="cta-button">Download Invoice</a>
        </div>
    
        <div class="footer">
          <p>&copy; ${currentYear} ${companyName} | All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
}