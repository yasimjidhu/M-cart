const express = require('express')
const cart = express.Router()
require('dotenv').config()
const cartController = require('../controller/cartController')

cart.get('/cart',cartController.toCart)
cart.get('/cart-products',cartController.cartProducts)
cart.post('/add-cart',cartController.addToCart)



module.exports = cart;