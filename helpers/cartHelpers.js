const cart = require('../model/cart')
const product = require('../model/productschema')
const productOffer = require('../model/productOffer')
const express = require('express')
const { ObjectId } = require('mongoose').Types;
const mongoose = require('mongoose')



// to get eachproducts in cart
const  getCartProducts = async function(userId){
    const productsInCart = await cart.aggregate([
        {
            $match:{userId:userId}
    
        },
        {
            $unwind:'$products'
        },
        {
            $lookup:{
                from:'products',
                localField:'products.productId',
                foreignField:'_id',
                as:'cartProducts'
            }
        },
        {
            $unwind:'$cartProducts'
        },
        {
            $project:{
                'cartProducts.productName':1,
                'cartProducts.image':{$arrayElemAt:['$cartProducts.image',4]},
                'cartProducts.price':1,
                'cartProducts.discountedPrice':1,
                'products.quantity':1,
                'cartProducts._id':1,
                'cartTotal':1
            }
        },
        
    ]);

    return productsInCart
}



const priceOfEachItem = async (user) => {
    const EachAmount = await cart.aggregate([
        {
            $match: { userId: user }
        },
        {
            $unwind: '$products'
        },
        {
            $lookup: {
                from: 'products',
                localField: 'products.productId',
                foreignField: '_id',
                as: 'cartItems'
            }
        },
        {
            $project: {
                item: '$products.productId',
                quantity: '$products.quantity',
                product: { $arrayElemAt: ['$cartItems', 0] },
            }
        },
        {
            $lookup:{
                from:'productoffers',
                localField:'item',
                foreignField:'productId',
                as:'offerData'
            }
        },
        {
            $unwind: { path: '$offerData', preserveNullAndEmptyArrays: true }
        },
        {
            $project: {
                item: 1,
                quantity: 1,
                total: {
                    $cond: {
                        if: { $ifNull: ['$offerData', false] },
                        then: {
                            $multiply: [
                                '$quantity',
                                {
                                    $subtract: [
                                        '$product.price',
                                        { $multiply: ['$product.price', { $divide: ['$offerData.OfferPercentage', 100] }] }
                                    ]
                                }
                            ]
                        },
                        else: { $multiply: ['$quantity', '$product.price'] }
                    }
                }
            }
        }
    ]);
    return EachAmount;
};
// total price of the entire cart items
const totalCartAmount = async (user) => {
    try {
        const eachItemAmounts = await priceOfEachItem(user);

        // Calculate the total cart amount by summing up the total amounts of each item
        let cartTotal = 0;
        eachItemAmounts.forEach((item) => {
            cartTotal += item.total;
        });

        return cartTotal;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to calculate total cart amount');
    }
};

// actual product price
const actualPriceAfterOffer = async (productId) => {
    try {
        const offerPrice = await productOffer.aggregate([
            {
                $match: {
                    productId: new mongoose.Types.ObjectId(productId),
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'productsWithOffers'
                }
            },
            {
                $unwind: '$productsWithOffers'
            },
            {
                $addFields: {
                    originalPrice: '$productsWithOffers.price',
                    offerPercentage: '$OfferPercentage' // Assuming 'OfferPercentage' is the correct field name in 'productOffer'
                }
            },
            {
                $project: {
                    _id: 0,
                    originalPrice: 1,
                    offerPercentage: 1,
                    productsWithOffers: 1
                }
            },
            {
                $addFields: {
                    discountedAmount: {
                        $subtract: [
                            '$originalPrice',
                            { $multiply: ['$originalPrice', { $divide: ['$offerPercentage', 100] }] }
                        ]
                    }
                }
            },
            {
                $project:{
                    _id:0,
                    discountedAmount:1,
                    offerPercentage:1
                }
            }
        ]);

        if (offerPrice.length > 0) {
            return offerPrice;
        } else {
            return null; // Handle case when no offer is found for the given product
        }
    } catch (err) {
        console.log(err);
        throw err;
    }
};


// function for find discounted amount
function calculateDiscountedPrice(originalPrice, discountPercentage) {
    const discountAmount = (originalPrice * discountPercentage) / 100;
    const discountedPrice = originalPrice - discountAmount;
    return discountAmount;
}



module.exports ={
    getCartProducts,
    priceOfEachItem,
    totalCartAmount,
    actualPriceAfterOffer,
    calculateDiscountedPrice
}