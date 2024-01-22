const express = require('express')
const path = require('path')
const multer = require('multer')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const session = require('express-session')
const cookie = require('cookie-session')
const userRouter = require('./Router/userRouter')
const admminRouter = require('./Router/adminRouter')
const authRouter = require('./Router/authRouter')
const cartRouter = require('./Router/cartRouter')
const accountRouter = require('./Router/accountRouter')
const orderRouter = require('./Router/orderRouter')
const {errorHandler} = require('./middleware/errorMiddleware')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const zoom = require('js-image-zoom')
const dotenv =require('dotenv')
const passport = require('passport')
const errorMiddleware = require('./middleware/errorMiddleware')
const passwordvalidator = require('password-validator')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { log, error } = require('console')
const res = require('express/lib/response')
dotenv.config()

const app = express()

app.use(session({
    secret:"secret",
    resave:false,
    saveUninitialized:true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000 // Set the session expiry time in milliseconds (e.g., 1 day)
      }
}))

//middleware
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.set('view engine','ejs')
app.use(express.static('Public'))
app.use('/uploads', express.static('uploads/profile_images'));


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
});


app.use(passport.initialize());
app.use(passport.session());

app.use('/admin',admminRouter)
app.use('/',userRouter)
app.use('/auth', authRouter);
app.use('/cart',cartRouter)
app.use('/account',accountRouter)
app.use('/order',orderRouter)


// Error handling middleware
app.use((err,req,res,next)=>{
    console.error(err.stack);
    res.status(500).send('internal server error')
})


const port = process.env.PORT||4000

app.listen(port,()=>{
    const {couponChecker,productOfferChecker,categoryOfferChecker} = require('./service/cronjob')
    couponChecker()
    productOfferChecker()
    categoryOfferChecker()
    console.log("server is running on http://localhost:3000 ");
})





