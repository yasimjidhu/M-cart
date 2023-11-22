const express = require('express')
const router = express.Router()
const user = require('../controller/usercontroller')
const otpcontroller = require('../controller/otpcontroller')
require('dotenv').config()
const userauth = require('../middleware/userAuth')
const auth =  require('../controller/authcontroller')

// user login
router.get('/user/indextologin',userauth.userExist,user.indextologin) 
router.post('/user/login',userauth.userExist,user.userLogin)
router.get('/',userauth.userExist,user.toHome)

// for signup
router.get('/user/tosignup',userauth.userExist,user.toSignup)
router.post('/user/signup',user.userSignup);
router.get('/user/logout',user.logout)
router.get('/user/tologin',userauth.userExist,user.signupToLogin)



// User logged Home page
router.get('/user/home',userauth.verifyUser, user.userlog)
router.get('/productview/:id',user.productview)
router.get('/user/toproduct-list',userauth.verifyUser,user.productlist)

// Brand wise product view
router.get('/products/:brandId',userauth.verifyUser)

//Forgot password
router.get('/forgot-pass',auth.renderforgotpassword)
router.post('/forgot-pass',auth.forgotpassword)
router.get('/reset-pass',auth.renderResetPassword)
router.post('/reset-pass',auth.resetpassword)





router.get('/send-otp',(req,res)=>{
    res.render('./user/verifyotp')
});
router.get('/verify-otp',user.toverifyotp)
router.post('/send-otp',otpcontroller.sendOtp)
router.post('/verify-otp',user.verifyOtp)
router.post('/resendOtp',user.resendSignupOTP)


router.get('/brand-wise/:brandId',userauth.verifyUser,user.toBrandwise)
router.get('/brands/filterbybrand',user.filterByBrand)

router.get('/allproductview/:categoryId',user.toViewAll)
router.post('/products-search',userauth.verifyUser,user.productSearch)

router.get('/cart',user.toCart)
module.exports = router