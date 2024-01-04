const mongoose = require('mongoose')

const productOfferSchema = new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
    },
    productName:{
        type:String,
        required:true
    },
    addedDate:{
        type:Date,
        required:true
    },
    OfferPercentage:{
        type:Number,
    },
    endDate:{
        type:Date
    }
});

// create a TTL index on the `expiryDate` field
productOfferSchema.index({endDate:1},{expireAfterSeconds:0})  // 0 means documents will be deleted immediately after `expiryDate`

const productOffer= mongoose.model('productOffer',productOfferSchema)
module.exports = productOffer