const mongoose = require("mongoose");

// Define the Tags schema
const categorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		maxlength: 120,
		unique: true,
	},
	description: { type: String, trim: true, maxlength: 1000 },
	courses: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Course",
		},
	],
}, { timestamps: true });

// Export the Tags model
module.exports = mongoose.model("Category", categorySchema);
