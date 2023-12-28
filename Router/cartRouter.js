const express = require('express')
const cart = express.Router()
require('dotenv').config()
const cartController = require('../controller/cartController')
const userAuth = require('../middleware/userAuth')

cart.get('/cart', userAuth.verifyUser,cartController.toCart)
cart.get('/cart-products',userAuth.verifyUser,cartController.cartProducts)
cart.post('/add-cart',userAuth.verifyUser,cartController.addToCart)
cart.delete('/removeItem/:productID',userAuth.verifyUser,cartController.RemoveItem)

// update order quantity
cart.post('/updateQuantity',userAuth.verifyUser,cartController.updateQuantity)

// chekout 
cart.get('/checkout',userAuth.verifyUser,cartController.toCheckout)



module.exports = cart;