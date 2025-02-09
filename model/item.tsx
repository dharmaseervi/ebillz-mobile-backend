import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the structure of the Product document
export interface ProductDocument extends Document {
    name: string;
    unit: string;
    hsnCode: string;
    sellingPrice: number;
    quantity: number;
    description: string;
    userId: mongoose.Schema.Types.ObjectId;
    selectedCompanyId: mongoose.Schema.Types.ObjectId;
    barcode: string;
}

// Define the schema for the Product document
const ProductSchema: Schema<ProductDocument> = new Schema({
    name: { type: String, required: true },
    unit: { type: String, required: true },
    hsnCode: { type: String, required: true },
    sellingPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    description: { type: String, required: true },
    barcode: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selectedCompanyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
});

// Export the Product model based on ProductDocument
export default mongoose.models?.Product || mongoose.model<ProductDocument>('Product', ProductSchema);
