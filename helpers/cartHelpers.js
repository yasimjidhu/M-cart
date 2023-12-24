const cart = require('../model/cart')
const product = require('../model/productschema')
const express = require('express')

const priceOfEachItem = async (user)=>{
    const EachAmount = await cart.aggregate([
        {
            $match:{userId:user}
        },
        {
            $unwind:'$products'
        },
        {
            $project:{
                item:'$products.productId',
                quantity:'$products.quantity',
            }
        },
        {
            $lookup:{
                from:'products',
                localField:'item',
                foreignField:'_id',
                as:'cartItems'
            }
        },
        {
            $project:{
                item: 1,
                quantity: 1,
                product: { $arrayElemAt: ['$cartItems', 0] }
            }
        },        
        {
            $project:{
                total:{$sum:{$multiply:['$quantity','$product.price']}}
            }
        }
    ])
    return EachAmount
}

module.exports ={
    priceOfEachItem
}