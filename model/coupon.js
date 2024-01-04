const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    couponName:String,
    code: String, // percentage, fixed, freeShipping
    minimumAmount: Number,
    discountAmount: Number,
    startDate: Date,
    endDate: Date,
    maxUsage: Number,
    usages:{
        type:Number,
        default:0
    },
    usageTime:[{type:Date}]
});

const coupon = mongoose.model('coupon',couponSchema)
module.exports = coupon
