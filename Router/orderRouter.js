const express = require('express')
const order = express.Router()
const orderController = require('../controller/orderController')
const userAuth = require('../middleware/userAuth')
const adminAuth = require('../middleware/adminAuth')
require('dotenv').config()

order.post('/placeOrder', userAuth.verifyUser, orderController.placeOrder)
order.get('/orderSuccess', userAuth.verifyUser, orderController.orderSuccess)
order.get('/toUserOrders', userAuth.verifyUser, orderController.toUserOrders)
order.get('/viewDetails/:orderId',userAuth.verifyUser,orderController.toViewOrderDetails)
order.put('/cancelOrder/:orderId', userAuth.verifyUser, orderController.cancelOrder)
order.get('/order-progress/:orderId', userAuth.verifyUser, orderController.getOrderStatus)
order.post('/verify-payment', userAuth.verifyUser, orderController.verifyPayment)


order.get('/cancelledOrders', userAuth.verifyUser, orderController.CancelledOrders)
order.get('/viewDetails/:orderId', adminAuth.verifyAdmin, orderController.toAdminDetailedOrders)

// apply coupons
order.post('/applyCoupon',userAuth.verifyUser,orderController.applyCoupon)

module.exports = order

