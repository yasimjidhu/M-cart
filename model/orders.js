const { ObjectId } = require('mongodb')
const mongoose = require('mongoose');
const { schema } = require('./category');


const orderSchema = new mongoose.Schema({
    userId:{
        type:ObjectId,
        required:true
    },
    paymentmode:{
        type:String,
        required:true
    },
    deliveryDate:{
        type:Date
    },
    status:{
        type:String
    },
    totalAmount:{
        type:Number
    },
    address:{
        type:Object
    },
    isEmpty:{
        type:Boolean,
        default:false
    },
    products:[
        {
            productId:{
                type:ObjectId,
                required:true
            },
            qty:{
                type:Number,
            },
            price:{
                type:Number
            }
        }
    ]
})

const orders = mongoose.model('orders',orderSchema)
module.exports = orders