const Razorpay = require("razorpay");

// Add debugging
console.log("Environment check:");
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "✓ Loaded" : "✗ Missing");
console.log("RAZORPAY_SECRET:", process.env.RAZORPAY_SECRET ? "✓ Loaded" : "✗ Missing");

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
  throw new Error("Razorpay credentials are missing. Check your .env file.");
}

exports.instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,   
  key_secret: process.env.RAZORPAY_SECRET,
});

console.log("✅ Razorpay instance initialized successfully");