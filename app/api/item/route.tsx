import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";
import ProductDocument from "@/model/item";
import User from "@/model/user";

export async function POST(request: Request) {
  await dbConnect();

  try {
    // Get user session from Clerk
    const { name, unit, hsnCode, sellingPrice, quantity, description, clerkUserId, barcode, selectedCompanyId } = await request.json();
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: "Clerk User ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const item = new ProductDocument({
      name,
      unit,
      hsnCode,
      sellingPrice,
      quantity,
      description,
      userId: user._id,
      barcode,
      selectedCompanyId
    });

    await item.save();
    return NextResponse.json({ success: true, items: item });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ success: false, error: 'Error creating item' });
  }
}



export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    const barcode = searchParams.get('barcode');
    const clerkUserId = searchParams.get('userId');
    const selectedCompanyId = searchParams.get('selectedCompanyId');

    // Ensure selectedCompanyId is provided
    if (!selectedCompanyId) {
      return NextResponse.json({ success: false, error: "Selected company ID is required" }, { status: 400 });
    }

    // Find user by Clerk User ID
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    let filterData = [];

    if (barcode) {
      // Search by barcode and selectedCompanyId
      filterData = await ProductDocument.find({
        barcode: { $regex: barcode, $options: 'i' },
        selectedCompanyId
      });
    } else if (search) {
      // Search by name and selectedCompanyId
      filterData = await ProductDocument.find({
        selectedCompanyId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { symbol: { $regex: search, $options: 'i' } }
        ]
      });
    } else if (id) {
      // Fetch product by id and selectedCompanyId
      filterData = await ProductDocument.findOne({ _id: id, selectedCompanyId });
    } else {
      // Fetch all products for the selected company
      filterData = await ProductDocument.find({ selectedCompanyId });
    }

    return NextResponse.json({ success: true, filterData });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ success: false, error: 'Error fetching products' }, { status: 500 });
  }
}


export async function PATCH(request: Request) {
  await dbConnect();

  try {
    const { id, ...updatedItem } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID is required" }, { status: 400 });
    }

    const updatedItems = await ProductDocument.findByIdAndUpdate(
      id,
      { $set: updatedItem },
      { new: true, runValidators: true }
    );

    if (!updatedItems) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, updatedItem });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ success: false, error: "Error updating item" }, { status: 500 });
  }
}