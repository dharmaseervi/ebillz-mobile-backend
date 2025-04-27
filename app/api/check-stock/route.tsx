// app/api/stock/check/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/utli/connectdb';
import ProductDocument from "@/model/item";

export async function GET(request: Request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const barcode = searchParams.get('barcode');
        const quantitys = Number(searchParams.get('quantity')) || 1;
        const selectedCompanyId = searchParams.get('selectedCompanyId');

        // Validate required parameters
        if (!selectedCompanyId) {
            return NextResponse.json(
                { success: false, error: "Company ID is required" },
                { status: 400 }
            );
        }

        if (!productId && !barcode) {
            return NextResponse.json(
                { success: false, error: "Product ID or barcode is required" },
                { status: 400 }
            );
        }

        // Find product by ID or barcode
        const query = { selectedCompanyId };
        if (productId) {
            query._id = productId;
        } else {
            query.barcode = barcode;
        }

        const product = await ProductDocument.findOne(query);

        if (!product) {
            return NextResponse.json(
                { success: false, error: "Product not found" },
                { status: 404 }
            );
        }
        // Check stock availability
        const available = product.quantity >= quantitys;
        const canFulfill = available ? quantitys : product.quantity;
    
        return NextResponse.json({
            success: true,
            available,
            currentStock: product.quantity,
            requestedQuantity: quantitys,
            canFulfill,
            product: {
                id: product._id,
                name: product.name,
                barcode: product.barcode
            }
        });

    } catch (error) {
        console.error('Stock check error:', error);
        return NextResponse.json(
            { success: false, error: "Server error during stock check" },
            { status: 500 }
        );
    }
}