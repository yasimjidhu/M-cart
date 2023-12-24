const express = require('express')
const cart = express.Router()
require('dotenv').config()
const cartController = require('../controller/cartController')

cart.get('/cart',cartController.toCart)
cart.get('/cart-products',cartController.cartProducts)
cart.post('/add-cart',cartController.addToCart)
cart.delete('/removeItem/:productID',cartController.RemoveItem)

// update order quantity
cart.post('/updateQuantity',cartController.updateQuantity)

// chekout 
cart.get('/checkout',cartController.toCheckout)



module.exports = cart;