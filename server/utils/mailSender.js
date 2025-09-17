const nodemailer = require("nodemailer");

const mailSender = async (email, title, body) => {
  try {
    console.log("📧 Sending mail...");
    console.log("To:", email);
    console.log("Using MAIL_USER:", process.env.MAIL_USER);

    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.gmail.com", // fallback
      port: 587, // Gmail ke liye recommended port
      secure: false, // true for port 465, false for 587
      auth: {
        user: process.env.MAIL_USER, // Gmail address
        pass: process.env.MAIL_PASS, // App Password
      },
    });

    let info = await transporter.sendMail({
      from: `"StudyNotion | CodeHelp" <${process.env.MAIL_USER}>`, // sender
      to: email, // receiver
      subject: title, // subject line
      html: body, // email body in HTML
    });

    console.log("✅ Mail sent successfully:", info.response);
    return info;
  } catch (error) {
    console.error("❌ Mail send failed:", error.message);
    return error.message;
  }
};

module.exports = mailSender;
