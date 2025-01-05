import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";
import ProductDocument from "@/model/item";

export async function POST(request: Request) {
  await dbConnect();

  try {
    // Get user session from Clerk
    const { name, unit, hsnCode, sellingPrice, quantity, description, userId, barcode } = await request.json();
    const item = new ProductDocument({
      name,
      unit,
      hsnCode,
      sellingPrice,
      quantity,
      description,
      userId,
      barcode
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
    const barcode = searchParams.get('barcode'); // Add barcode to the query

    let filterData = [];
    console.log(search, 'search', barcode, 'barcode');

    if (barcode) {
      // If barcode is provided, search by barcode
      console.log(barcode);
      
      filterData = await ProductDocument.find({ barcode: { $regex: barcode, $options: 'i' } });
      console.log(filterData);
      
    } else if (search) {
      // If search term is provided, search by name or symbol
      filterData = await ProductDocument.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { symbol: { $regex: search, $options: 'i' } }
        ]
      });
    } else if (id) {
      // If id is provided, fetch the product by id
      filterData = await ProductDocument.findOne({ _id: id });
    } else {
      // If no parameters are provided, fetch all products
      filterData = await ProductDocument.find();
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