const { ObjectId } = require("bson");
const mongoose = require('mongoose')

const returnSchema = new mongoose.Schema({
    reason:{
        type:String,
        required:true
    },
    requestedDate:{
        type:Date
    },
    userId:{
        type:ObjectId,
        required:true
    },
    orderId:{
        type:ObjectId
    }
})

const returns = mongoose.model('returns',returnSchema)
module.exports = returns