const mongoose = require('mongoose')
const schema = mongoose.Schema;
const connection = require('../config/database');

const brandschema = mongoose.Schema({
    brandName:{
        type:String,
        required:true,
        unique:true
    },
    addedDate:{
        type:Date,
        
    },
    brandStatus:{
        type:Boolean,
        default:true
    },
    image:{
        type:String,
        required:true
    }
});

const brands = mongoose.model('brands',brandschema)
module.exports = brands ;