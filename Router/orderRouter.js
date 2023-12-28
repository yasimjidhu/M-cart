const express = require('express')
const order = express.Router()
const orderController = require('../controller/orderController')
const userAuth = require('../middleware/userAuth')
require('dotenv').config()

order.post('/placeOrder', userAuth.verifyUser, orderController.placeOrder)
order.get('/orderSuccess', userAuth.verifyUser, orderController.orderSuccess)
order.get('/toUserOrders', userAuth.verifyUser, orderController.toUserOrders)
order.put('/cancelOrder/:orderId', userAuth.verifyUser, orderController.cancelOrder)
order.get('/order-progress/:orderId', userAuth.verifyUser, orderController.getOrderStatus)

order.post('/verify-payment', userAuth.verifyUser, orderController.verifyPayment)


order.get('/cancelledOrders', userAuth.verifyUser, orderController.CancelledOrders)
order.get('/viewDetails/:orderId', userAuth.verifyUser, orderController.toAdminDetailedOrders)
module.exports = order

