const { send } = require('express/lib/response');
const nodemailer = require('nodemailer');
const User = require('../model/userSchema');
require('dotenv').config();

// Define the time limit for OTP expiration in seconds (e.g., 5 minutes)
const OTP_EXPIRATION_TIME = 5 * 60; // 5 minutes

// Create a map to store OTPs with their creation time
const otpMap = new Map();

// Create a transporter with your email service details
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use your email service (e.g., 'Gmail', 'Outlook')
    auth: {
        user: process.env.SECRET_EMAIL, // Your email address
        pass: process.env.EMAIIL_SECRET_PASSWORD, // Your email password or an App Password
    },
});

// Function to send OTP via email with expiration time
async function sendOtp(email) {
    console.log('called');
    try {
        const otp = generateOTP();

        // Create an email with the OTP
        const mailOptions = {
            from: 'jidhuyasim@gmail.com',
            to: email,
            subject: 'Your OTP for signup',
            text: `Your OTP is ${otp}`,
        };

        // Store OTP along with its creation time in the map
        otpMap.set(email, { otp, createdAt: Date.now() });

        // Send the email using the transporter
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return otp;
    } catch (err) {
        console.error(err);
        throw new Error('Failed to send OTP via email');
    }
}

// Helper function to generate a random OTP
function generateOTP() {
    return (Math.floor(1000 + Math.random() * 9000)).toString();
}

// Verify OTP with expiration check
function verifyOTP(email, enteredOTP) {
    const storedOTP = otpMap.get(email);

    if (!storedOTP) {
        return false; // OTP not found (expired or not generated)
    }

    // Check if the OTP is expired
    const currentTime = Date.now();
    const elapsedTime = (currentTime - storedOTP.createdAt) / 1000; // Convert milliseconds to seconds
    if (elapsedTime > OTP_EXPIRATION_TIME) {
        otpMap.delete(email); // Remove expired OTP from the map
        return false; // OTP expired
    }

    // Check if the entered OTP matches the stored OTP
    if (storedOTP.otp === enteredOTP) {
        otpMap.delete(email); // Remove validated OTP from the map
        return true; // OTP verified
    }

    return false; // OTP mismatch
}

module.exports = {
    transporter,
    generateOTP,
    sendOtp,
    verifyOTP,
};
