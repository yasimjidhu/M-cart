const mongoose = require('mongoose')


const cartSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId
    },
    products:[{
        productId:{
        type:mongoose.Types.ObjectId,
        ref:'products',
        required:true
        },
        quantity:{
            type:Number
        }
    }],
    discountedAmount:{
        type:Number,
        default:0
    }
   
})

const Cart = mongoose.model('cart',cartSchema)
module.exports = Cart;