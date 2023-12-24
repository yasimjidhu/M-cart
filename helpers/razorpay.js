const cart = require('../model/cart')
const product = require('../model/productschema')
const express = require('express')
const orders = require('../model/orders')
const Razorpay = require('razorpay')
require("dotenv").config();



module.exports = {
    createRazorpayOrder:(order)=>{
    return new Promise ((resolve,reject)=>{    
        const razorpay = new Razorpay({
            key_id:  process.env.RAZORPAY_KEY_ID,
            key_secret:  process.env.RAZORPAY_KEY_SECRET
          });

    
      
          const razorpayOrder = razorpay.orders.create({
            
              amount: order.amount, 
              currency: 'INR',
              receipt: order.receipt,
          });
          resolve(razorpayOrder) ;
      })
}
};


module.exports 