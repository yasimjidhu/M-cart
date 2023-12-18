const express = require('express')
const order = express.Router()
const orderController = require('../controller/orderController')
require('dotenv').config()

order.post('/placeOrder',orderController.placeOrder)
order.get('/orderSuccess',orderController.orderSuccess)
order.get('/toUserOrders',orderController.toUserOrders)
order.put('/cancelOrder/:orderId',orderController.cancelOrder)

order.get('/cancelledOrders',orderController.CancelledOrders)
module.exports = order

