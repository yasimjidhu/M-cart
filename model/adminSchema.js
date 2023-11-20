const mongoose = require('mongoose')
const schema = mongoose.Schema
const connection = require('../config/database')

const adminschema = mongoose.Schema({
    email:{
        required:true,
        type:String
    },
    password:{
        required:true,
        type:String
    }
})

const admin = mongoose.model('admin',adminschema);
module.exports = admin;
