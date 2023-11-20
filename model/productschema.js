const mongoose = require('mongoose')
const schema = mongoose.Schema
const connection = require('../config/database')

const productschema = mongoose.Schema({
    category:{
        type: String,
    },
    productName:{
        type:String,

    },
    price:{
        type:Number,

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
        type:String,
    },
    status:{
        type:Boolean,
        // default:true,    
    },
   
})

const products = mongoose.model('products',productschema);
module.exports = products;