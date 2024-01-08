const mongoose = require('mongoose')

const categoryOfferSchema = new mongoose.Schema({
    categoryId:{
        type:mongoose.Schema.Types.ObjectId,
    },
    categoryName:{
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
    discountedAmount:{
        type:Number,
        default:0
    },
    endDate:{
        type:Date
    }
})

const categoryOffer = mongoose.model('categoryOffer',categoryOfferSchema)
module.exports = categoryOffer