const mongoose = require("mongoose")

const OTPSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		lowercase: true,
		trim: true,
		unique: true,
	},
	otpHash: {
		type: String,
		required: true,
		select: false,
	},
	attempts: {
		type: Number,
		default: 0,
		min: 0,
	},
	expiresAt: {
		type: Date,
		required: true,
		index: { expires: 0 },
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

const OTP = mongoose.model("OTP", OTPSchema)

module.exports = OTP
