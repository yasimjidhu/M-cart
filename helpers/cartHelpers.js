const cart = require('../model/cart')
const product = require('../model/productschema')
const productOffer = require('../model/productOffer')
const express = require('express')

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



module.exports ={
    priceOfEachItem,
    totalCartAmount
}