import dbConnect from "@/utli/connectdb";
import { NextResponse } from "next/server";
import ProductDocument from "@/model/item";

export async function POST(request: Request) {
  await dbConnect();

  try {
    // Get user session from Clerk
    const { name, unit, hsnCode, sellingPrice, quantity, description, userId } = await request.json();
    const item = new ProductDocument({
      name,
      unit,
      hsnCode,
      sellingPrice,
      quantity,
      description,
      userId
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

    let filterData = [];
    console.log(search, 'search');

    if (search) {
      filterData = await ProductDocument.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { symbol: { $regex: search, $options: 'i' } }
        ]
      });
    } else if (id) {
      filterData = await ProductDocument.findOne({ _id: id });
    } else {
      filterData = await ProductDocument.find();
    }

    return NextResponse.json({ success: true, filterData });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ success: false, error: 'Error fetching products' }, { status: 500 });
  }
}

