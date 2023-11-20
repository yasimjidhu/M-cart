const { send } = require('express/lib/response');
const nodemailer = require('nodemailer');
const User = require('../model/userSchema');
require('dotenv').config()


// Create a transporter with your email service details
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use your email service (e.g., 'Gmail', 'Outlook')
    auth: {
    user: process.env.SECRET_EMAIL, // Your email address
    pass: process.env.EMAIIL_SECRET_PASSWORD, // Your email password or an App Password
    },
});

// Function to send OTP via email
async function sendOtp(email,otp) {
    console.log('called');
    try { 
    // console.log("to email is .......",JSON.stringify(req.body));
    // const {email1} = req.body;

    // Generate a 4-digit OTP

        // // Save the user and OTP to the database
        // const newUser = new User({ email: otp });
        // await newUser.save();

        // Create an email with the OTP
        const mailOptions = {
            from: 'jidhuyasim@gmail.com',
            to: email,
            subject: 'Your OTP for signup',
            text: `Your OTP is ${otp}`,
        };

        // Send the email using the transporter
        const info =await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return otp;
        // res.json({ message: 'OTP sent via email' });
    } catch (err) {
        console.error(err);
        // res.status(500).json({ message: 'Failed to send OTP via email' });
    }
}

// Helper function to generate a random OTP
function generateOTP() {
    return (Math.floor(1000 + Math.random() * 9000)).toString();
}

// Verify OTP


module.exports = {
    transporter,
    generateOTP,
    sendOtp,
};
