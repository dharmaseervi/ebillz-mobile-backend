import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the structure of the Product document
export interface ProductDocument extends Document {
    name: string;
    unit: string;
    hsnCode: string;
    sellingPrice: number;
    quantity: number;
    description: string;
    userId: string;
}

// Define the schema for the Product document
const ProductSchema: Schema<ProductDocument> = new Schema({
    name: { type: String, required: true },
    unit: { type: String, required: true },
    hsnCode: { type: String, required: true },
    sellingPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    description: { type: String, required: true },
    userId: { type: String, required: true },
});

// Export the Product model based on ProductDocument
export default mongoose.models?.Product || mongoose.model<ProductDocument>('Product', ProductSchema);
