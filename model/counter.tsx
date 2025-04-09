import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    selectedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    sequenceValue: { type: Number, default: 1 },
});

// Ensure uniqueness per (user, company)
CounterSchema.index({ userId: 1, selectedCompanyId: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
