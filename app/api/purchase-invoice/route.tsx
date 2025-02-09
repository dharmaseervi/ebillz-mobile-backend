
import Purchase from "@/model/purchase";
import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";
import ProductDocument from "@/model/item";
import User from "@/model/user";

export async function POST(request: Request) {
    try {
        // Connect to the database
        await dbConnect();

        // Parse the request body
        const {
            invoiceNumber,
            purchaseOrderNumber,
            supplierName,
            supplierId,
            purchaseDate,
            dueDate,
            items,
            invoiceStatus,
            totalAmount,
            clerkUserId,
            selectedCompanyId
        } = await request.json();

        if (!clerkUserId) {
            return NextResponse.json({ error: "Unauthorized: User ID missing" }, { status: 401 });
        }

    
        // Fetch user details
        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!selectedCompanyId) {
            return NextResponse.json({ error: "Selected company ID is required" }, { status: 400 });
        }
        // Create a new purchase document
        const purchaseInvoice = new Purchase({
            invoiceNumber,
            purchaseOrderNumber,
            supplierName,
            supplierId,
            purchaseDate,
            dueDate,
            items,
            invoiceStatus,
            totalAmount,
            userId: user._id,
            selectedCompanyId
        });

        console.log(purchaseInvoice);
        
        // Save the purchase document to the database
        await purchaseInvoice.save();

        // Update stock for each item
        for (const item of items) {
            const {
                productId, quantity } = item;

            // Find the item in the inventory
            const existingItem = await ProductDocument.findById(
                productId);
            if (existingItem) {
                // Update the stock quantity
                existingItem.quantity += quantity;

                // Save the updated item
                await existingItem.save();
            } else {
                console.error(`Item with ID ${productId} not found`);
                return NextResponse.json(
                    { error: `Item with ID ${productId} not found` },
                    { status: 404 }
                );
            }
        }

        // Return a successful response with the saved data
        return NextResponse.json({ data: purchaseInvoice }, { status: 201 });
    } catch (error: any) {
        // Return an error response
        console.log("Error creating purchase invoice:", error);

        return NextResponse.json(
            { error: error.message || "An unknown error occurred" },
            { status: 500 }
        );
    }
}


export async function GET(request: Request) {
    try {
        // Connect to the database
        await dbConnect();

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const supplierId = searchParams.get("supplierId");
        const allBills = searchParams.get("allbills");
        const unpaidBills = searchParams.get("unpaidbills");
        const paidBills = searchParams.get("paidbills");
        const clerkUserId = searchParams.get("userId");
        const selectedCompanyId = searchParams.get("selectedCompanyId");


        if (!clerkUserId) {
            return NextResponse.json({ error: "Unauthorized: User ID missing" }, { status: 401 });
        }

        // Fetch user details
        const user = await User.findOne({ clerkUserId });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!selectedCompanyId) {
            return NextResponse.json({ error: "Selected company ID is required" }, { status: 400 });
        }

        // Build query object
        const query: any = { selectedCompanyId, userId: user._id }
        if (unpaidBills) query.invoiceStatus = "not paid";
        if (paidBills) query.invoiceStatus = "paid";
        if (supplierId) query.supplierId = supplierId;
        if (id) query._id = id;
        // Fetch purchase invoices based on query
        const purchaseInvoices = await Purchase.find(query).populate("items.productId")

        return NextResponse.json({ data: purchaseInvoices }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching purchase invoices:", error);
        return NextResponse.json(
            { error: error.message || "An unknown error occurred" },
            { status: 500 }
        );
    }
}
export async function PUT(request: Request) {
    try {
        // Connect to the database
        await dbConnect();

        // Parse the request body
        const {
            id, // Invoice ID to update
            invoiceNumber,
            purchaseOrderNumber,
            supplierName,
            supplierId,
            purchaseDate,
            dueDate,
            items,
            invoiceStatus,
            totalAmount,
        } = await request.json();

        // Validate if the ID exists
        if (!id) {
            return NextResponse.json(
                { error: "Invoice ID is required for update" },
                { status: 400 }
            );
        }

        // Find the existing purchase invoice
        const existingInvoice = await Purchase.findById(id);

        if (!existingInvoice) {
            return NextResponse.json(
                { error: `Purchase invoice with ID ${id} not found` },
                { status: 404 }
            );
        }

        // Map items by product ID for easier comparison
        const previousItemsMap = new Map(
            existingInvoice.items.map((item: any) => [item.productId.toString(), item.quantity])
        );

        for (const newItem of items) {
            const product = await ProductDocument.findById(newItem.productId);
            if (!product) {
                console.error(`Product with ID ${newItem.productId} not found`);
                continue; // Skip this iteration if the product is not found
            }

            const previousQuantity = previousItemsMap.get(newItem.productId.toString()) || 0;
            const quantityDifference = newItem.quantity - previousQuantity;

            console.log(`Updating Product: ${newItem.productId}`);
            console.log(`Previous Quantity: ${previousQuantity}`);
            console.log(`New Quantity: ${newItem.quantity}`);
            console.log(`Quantity Difference: ${quantityDifference}`);

            product.quantity += quantityDifference;

            // Initialize or update purchaseQuantity
            product.purchaseQuantity = (product.purchaseQuantity || 0) + quantityDifference;

            try {
                await product.save();
                console.log(`Product ${product._id} updated successfully`);
            } catch (error) {
                console.error(`Error saving product ${product._id}:`, error);
            }

            previousItemsMap.delete(newItem.productId.toString());
        }


        // Revert stock for removed items
        for (const [removedProductId, removedQuantity] of previousItemsMap.entries()) {
            const removedProduct = await ProductDocument.findById(removedProductId);
            if (removedProduct) {
                removedProduct.quantity -= removedQuantity;
                removedProduct.purchaseQuantity = (removedProduct.purchaseQuantity || 0) - removedQuantity;
                await removedProduct.save();
            }
        }

        // Update the purchase invoice fields
        existingInvoice.invoiceNumber = invoiceNumber ?? existingInvoice.invoiceNumber;
        existingInvoice.purchaseOrderNumber = purchaseOrderNumber ?? existingInvoice.purchaseOrderNumber;
        existingInvoice.supplierName = supplierName ?? existingInvoice.supplierName;
        existingInvoice.supplierId = supplierId ?? existingInvoice.supplierId;
        existingInvoice.purchaseDate = purchaseDate ?? existingInvoice.purchaseDate;
        existingInvoice.dueDate = dueDate ?? existingInvoice.dueDate;
        existingInvoice.items = items ?? existingInvoice.items;
        existingInvoice.invoiceStatus = invoiceStatus ?? existingInvoice.invoiceStatus;
        existingInvoice.totalAmount = totalAmount ?? existingInvoice.totalAmount;

        // Save the updated invoice
        await existingInvoice.save();

        return NextResponse.json(
            { message: "Purchase invoice updated successfully", data: existingInvoice },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error updating purchase invoice:", error);
        return NextResponse.json(
            { error: error.message || "An unknown error occurred" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        // Connect to the database
        await dbConnect();

        // Parse the request body
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        console.log("ID", id);

        // Validate if the ID exists
        if (!id) {
            return NextResponse.json(
                { error: "Invoice ID is required for deletion" },
                { status: 400 }
            );
        }

        // Find the existing purchase invoice
        const existingInvoice = await Purchase.findById(id);

        if (!existingInvoice) {
            return NextResponse.json(
                { error: `Purchase invoice with ID ${id} not found` },
                { status: 404 }
            );
        }

        // Revert stock for each item
        for (const item of existingInvoice.items) {
            const product = await ProductDocument.findById(item.productId);
            if (product) {
                product.quantity -= item.quantity;
                product.purchaseQuantity = (product.purchaseQuantity || 0) - item.quantity;
                await product.save();
            }
        }

        // Delete the purchase invoice
        await existingInvoice.deleteOne();

        return NextResponse.json(
            { message: "Purchase invoice deleted successfully" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error deleting purchase invoice:", error);
        return NextResponse.json(
            { error: error.message || "An unknown error occurred" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        // Connect to the database
        await dbConnect();

        // Parse the request body
        const { id, invoiceStatus } = await request.json();

        // Validate if the ID exists
        if (!id) {
            return NextResponse.json(
                { error: "Invoice ID is required for update" },
                { status: 400 }
            );
        }

        // Find the existing purchase invoice
        const existingInvoice = await Purchase.findById(id);

        if (!existingInvoice) {
            return NextResponse.json(
                { error: `Purchase invoice with ID ${id} not found` },
                { status: 404 }
            );
        }

        // Update the invoice status
        existingInvoice.invoiceStatus = invoiceStatus ?? existingInvoice.invoiceStatus;

        // Save the updated invoice
        await existingInvoice.save();

        return NextResponse.json(
            { message: "Purchase invoice updated successfully", data: existingInvoice },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error updating purchase invoice:", error);
        return NextResponse.json(
            { error: error.message || "An unknown error occurred" },
            { status: 500 }
        );
    }
}