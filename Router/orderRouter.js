const express = require('express')
const order = express.Router()
const orderController = require('../controller/orderController')
require('dotenv').config()

order.post('/placeOrder',orderController.placeOrder)
order.get('/orderSuccess',orderController.orderSuccess)

module.exports = order

