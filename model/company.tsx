import mongoose, { Schema } from 'mongoose';

const CompanySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  gstNumber: { type: String, required: true },
  userId: { type: String, required: true },
  companyBankDetails: [{ type: Schema.Types.ObjectId, ref: 'CompanyBankDetails' }],
});

// Compound indexes to ensure email and gstNumber are unique for each user
CompanySchema.index({ email: 1, userId: 1 }, { unique: true });
CompanySchema.index({ gstNumber: 1, userId: 1 }, { unique: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
