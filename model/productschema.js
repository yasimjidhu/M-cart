const mongoose = require('mongoose')
const schema = mongoose.Schema
const connection = require('../config/database');
const { ObjectId } = require('mongodb');

const productschema = mongoose.Schema({
    category:{
        type: ObjectId,
    },
    productName:{
        type:String,

    },
    price:{
        type:Number,
        min:0
    },
    stock:{
        type:Number,
        default:0
    },
    image:{
        type:Array,

    },
    description:{
        type:String,
    },
    specifications: [{
        type: String,
    }],
    brand:{
        type:ObjectId,
        ref:'brands'
    },
    status:{
        type:Boolean,
        // default:true,    
    },
   
})

const products = mongoose.model('products',productschema);
module.exports = products;