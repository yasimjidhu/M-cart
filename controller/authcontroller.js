const User = require('../model/userSchema');
const bcrypt = require('bcryptjs');
const passwordValidator = require('password-validator'); // Import the password-validator library
const { transporter, generateOTP, sendOtp } = require('../controller/otpcontroller');
const { logout } = require('./usercontroller');

// Render the forgot password page
const renderforgotpassword = (req, res) => {
  res.render('./user/forgot-pass', { title: 'Forgot Password' });
};

// Handle the forgot password request
const forgotpassword = async (req, res) => {
    console.log('reached and called _');
  const email = req.body.email;
  const user = await User.findOne({ email:email });
  console.log(user)
  console.log(email)

  if (!user) {
    res.redirect('/forgot-pass');
    console.log('no user found');
  } else {
    const otp = generateOTP();
    console.log(otp);
    // Send the otp to the user
    sendOtp(user.email, otp);
    req.session.resetpasswordOTP=otp

    // Store the otp and user email in the session for verification
    // req.session.resetpasswordOTP = otp;
    req.session.resetpasswordEmail = user.email;

    res.redirect('/reset-pass');
  }
};

// Render the reset password page
const renderResetPassword = (req, res) => {
  res.render('./user/resetPass', { title: 'Reset Password' });
};

// // Define password validation schema
// const schema = new passwordValidator();
// schema
//     .is().min(8)          // Minimum length is 8 characters
//     .has().uppercase()     // Must have uppercase
//     .has().lowercase()     // Must have lowercase
//     .has().digits()        // Must have digits
//     .has().symbols()       // Must have symbols
//     .is().not().spaces();  // Must not have spaces

const resetpassword = async (req, res) => {
  const otp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (otp === req.session.resetpasswordOTP) {
    if (newPassword === confirmPassword) {
      const email = req.session.resetpasswordEmail;
      const user = await User.findOne({ email: email });

      if (!user) {
        res.render('./user/forgot-pass', { err: 'User not found with that email' });
      } else {
        // Reset the user's password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;

        // Save the updated user
        await user.save();

        // Clear the session
        req.session.resetpasswordOTP = undefined;
        req.resetpasswordEmail = undefined;

        // Redirect to the login page with a success message
        res.render('./user/userlogin', { msg: 'Password reset successfully' });
      }
    } else {
      // Handle password confirmation mismatch
      res.render('./user/resetPass', { title: 'Reset password', err: 'Confirm password is incorrect' });
    }
  } else {
    // Handle incorrect OTP
    res.render('./user/resetPass', { err: 'Incorrect OTP' });
  }
};


module.exports = {
  renderforgotpassword,
  forgotpassword,
  renderResetPassword,
  resetpassword,
};
