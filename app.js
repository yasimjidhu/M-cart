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
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const zoom = require('js-image-zoom')
const dotenv =require('dotenv')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { log } = require('console')
dotenv.config()

const app = express()

app.use(session({
    secret:"secret",
    resave:false,
    saveUninitialized:true,
}))

//middleware
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.set('view engine','ejs')
app.use(express.static('public'))



app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
});


app.use(passport.initialize());
app.use(passport.session());


app.use('/',userRouter)
app.use('/admin',admminRouter)

// using auth router
app.use('/auth', authRouter);


const port = process.env.PORT||4000

app.listen(port,()=>{
    console.log("server is running on http://localhost:3000 ");
})





