const { json } = require('body-parser')
const cart = require('../model/cart')
const brand = require('../model/brands')
const products = require('../model/productschema')
const address = require('../model/address')
const orders = require('../model/orders')
const router = require('../Router/cartRouter')
const session = require('express-session')
const users = require('../model/userSchema')
const { default: mongoose, set } = require('mongoose')
const { ObjectId } = require('mongoose');
const { use } = require('passport')
const order = require('../Router/orderRouter')
const errorHandler = require('../middleware/errorMiddleware')
const Cart = require('../model/cart')
const coupon = require('../model/coupon')
const wallet = require('../model/wallet');
const cartHelpers = require('../helpers/cartHelpers')
const crypto = require('crypto')
const Razorpay = require('razorpay')
require('dotenv').config()


const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const placeOrder = async (req, res) => {
    console.log('placeorder reached')
    try {
  
        const user = await users.findOne({ email: req.session.email });
        const userId = user._id;
        console.log('type of userid',typeof(userId))
        console.log('userid',userId)

        if (!req.body) {
            return res.status(404).json({ message: 'Data not found in request' });
        }

        const { selectedAddress, selectedPaymentMethod, selectedShippingType, quantity, totalPrice } = req.body;


        // Calculate the grand total
        const grandTotal = totalPrice;


        // Get products from cart aggregate (assuming cart and products collections exist)
        const aggregateData = await cart.aggregate([
            { $match: { userId: userId } },
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $group: {
                    _id: null,
                    productDetails: {
                        $push: {
                            _id: '$productDetails._id',
                            quantity: '$products.quantity',
                            price: '$productDetails.price'
                        }
                    }
                }
            }
        ]).exec();

        const productsArray = [];

        // Process each product in the cart
        for (const data of aggregateData) {
            for (const innerArray of data.productDetails) {
                const productId = innerArray._id;
                const quantity = innerArray.quantity;
                const price = innerArray.price[0];

                try {
                    // Update product stock
                    const updatedProduct = await products.findOneAndUpdate(
                        { _id: productId, stock: { $gte: quantity } },
                        { $inc: { stock: -quantity } },
                        { new: true }
                    );

                    if (updatedProduct) {
                        // Remove the product from the cart
                        const removedItem = await cart.findOneAndUpdate(
                            { userId: userId },
                            { $pull: { products: { productId } } },
                            { multi: true }
                        );

                        if (removedItem) {
                            productsArray.push({
                                productId,
                                quantity,
                                price
                            });
                        } else {
                            console.log(`Product with ID ${productId} not found in the cart.`);
                        }
                    } else {
                        return res.status(400).json({ success: false,lowStock:true, message: 'Insufficient stock for the product' });
                    }
                } catch (error) {
                    console.error(`Failed to remove product with ID ${productId} from the cart: ${error}`);
                }
            }
        }

        let orderSuccess = false
        let successResponse = null;

        if(selectedPaymentMethod=='cashOnDelivery'){
            orderSuccess = true
            successResponse = {codSuccess:true,message:'Order success'}
            // res.json({
            //     codSuccess:true,
            //     message:'order success'
            // })
        }else if (selectedPaymentMethod === 'razorPay') {

            orderSuccess = true
            successResponse = { success: true, title: 'Order Confirmation', message: 'Order created successfully' };

            const options = {
                amount: grandTotal * 100, // amount in paisa
                currency: 'INR',
                receipt: savedOrder._id, // Use the order ID as the receipt
            };

            const razorpayOrder = await instance.orders.create(options);

            res.status(201).json({
                title:'Order Confirmtion',
                success: true,
                message: 'Razorpay order created successfully',
                data: {
                    order: savedOrder,
                    razorpayOrderId: razorpayOrder.id,
                    razorpayOptions: razorpayOrder,
                    online:true,
                }
            });

        } else if(selectedPaymentMethod === 'walletPayment') {
            const userWallet = await wallet.findOne({userId:userId})
            const walletBalance = userWallet.balance

            // check if the wallet balance covers the total price
            if(walletBalance < grandTotal){
                console.log('below balance')
                return res.status(400).json({ success: false,belowBalance:true, message: 'Insufficient wallet balance' })
            }

            // Deduct payment from the wallet balance
            const updatedBalance = walletBalance - grandTotal;

            // Create a transaction record for the wallet payment
            const newTransaction = {
                transactionType: 'debit',
                amount: grandTotal,
                from: 'Order Payment', 
            };
            
            // Update the user's wallet balance and add the transaction to the transactions array in the database
            await wallet.findOneAndUpdate(
                { userId: userId },
                {
                balance: updatedBalance,
                $push: { transactions: newTransaction }
                }
            );

            console.log('wallet payment success')

            orderSuccess = true;
            successResponse = { success: true, walletpayment:true ,title: 'Order Confirmation', message: 'Order created successfully' };

            // res.status(201).json({ success: true,title:'Order Confirmtion', message: 'Order created successfully'});
        }

        if(orderSuccess){
            const newOrder = new orders({
                userId: userId,
                paymentmode: selectedPaymentMethod,
                shippingMethod: selectedShippingType,
                deliveryDate: new Date(),
                status: 'Pending',
                totalAmount: grandTotal,
                address: selectedAddress,
                products: productsArray,
            });

            const savedOrder = await newOrder.save();

            

            if(successResponse){
             return res.status(201).json({ ...successResponse, data: savedOrder });
        }
    }

      return res.status(400).json({ success: false, message: 'Invalid payment method or payment processing issue' });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const verifyPayment = async (req, res) => {
    try {
      console.log('verifypayment called')
      console.log(req.body)
      
      let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
     
      const {payment,order}=req.body
      const orderArray = order.data.razorpayOrder
      console.log('orderArray is',orderArray)

  
      const orderId= order.data.order._id
      console.log('orderid in the database',orderId)
      const updateOrderDocument = await orders.findByIdAndUpdate(orderId, {
        status: "Paid",
      });
          res.json({ success: true });
      hmac.update(payment.razorpay_order_id +"|" + payment.razorpay_payment_id);
  
      hmac = hmac.digest("hex");
      if (hmac === req.body.payment.razorpay_signature) {
        const orderId = new mongoose.Types.ObjectId(
          req.body.order.data.order._id
        );
      } else {
        
        res.json({ failure: true });
      }
    } catch (error) {
  
      console.error("failed to verify the payment", error);
    }
  };
  
  


const orderSuccess = (req,res)=>{
    try {
        res.render('./user/orderPlaced')
    } catch (error) {
        errorHandler(error,req,res)
    }
    
}
const toUserOrders = async (req, res) => {
    const userEmail = req.session.email;
    const user = await users.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    const userId = user._id;
    
    const userOrders = await orders.aggregate([
      {
        $match: {
          userId: userId // Match orders for a specific user
        }
      },
      {
        $unwind: '$products' // Unwind the products array
      },
      {
        $lookup: {
          from: 'products', // Lookup from the products collection
          localField: 'products.productId',
          foreignField: '_id',
          as: 'productDetails' // Store the product details in 'productDetails' array
        }
      },
      {
        $unwind: '$productDetails' // Unwind the productDetails array
      },
      {
        $project: {
          'productDetails.productName': 1, // Include specific fields from productDetails
          'productDetails.image': 1,
          'productDetails.price': 1,
          'products.quantity': 1, // Include quantity from the orders collection
          'totalAmount': 1, // Include totalAmount from the orders collection
          'status': 1,
          'deliveryDate':1,
          'totalCost': { $multiply: ['$products.quantity', '$productDetails.price'] } // Calculate total cost
        }
      },
      {
        $group: {
          _id: '$_id', // Group by order ID
          productDetails: { $push: '$productDetails' }, // Push product details for the order
          products: {
            $push: {
              quantity: '$products.quantity', // Push quantities for each product
              totalCost: '$totalCost' // Push total cost for each product
            }
          },
          totalAmount: { $first: '$totalAmount' }, // Retrieve totalAmount
          status: { $first: '$status' }, // Retrieve status
          deliveryDate: { $first: '$deliveryDate' } // Retrieve createdAt date
        }
      },
      {
        $sort: { deliveryDate: -1 } // Sort by createdAt field in descending order (latest first)
      }
    ]);
    
    
    res.render('./user/userOrders', { userOrders,title:'My Orders' });
  };
  
  
 // cancel the order
 const cancelOrder = async (req, res) => {
    const orderId = req.params.orderId;
  
    try {
      const order = await orders.findById(orderId);
  
      // Check if the order status is 'Shipped'
      if (order.status === 'Shipped') {
        return res.status(400).json({ message: 'Cannot cancel a shipped order' });
      } else if (order.status === 'Cancelled') {
        return res.status(403).json({ message: 'This order has already been cancelled' });
      }
  
      // Retrieve the products from the cancelled order
      const productsToCancel = order.products;
  
      // Restore cancelled product quantities to inventory
      for (const product of productsToCancel) {
        const inventoryProduct = await products.findById(product.productId);
  
        if (inventoryProduct) {
          inventoryProduct.stock += product.quantity;
          await inventoryProduct.save();
        }
      }
  
      // Update the order status to 'Cancelled'
      const updatedOrder = await orders.findByIdAndUpdate(
        orderId,
        { $set: { status: 'Cancelled' } },
        { new: true }
      );
  
      // Calculate the total amount from the cancelled order
      const totalAmount = order.totalAmount;
  
      // Retrieve user information
      const user = await users.findOne({ email: req.session.email });
      const userId = user._id;
  
      // Add transaction to the user's wallet for order cancellation
      const userWallet = await wallet.findOne({ userId });
  
      if (!userWallet) {
        // If user's wallet doesn't exist, create a new wallet entry
        const newWallet = new wallet({
          userId,
          balance: totalAmount,
          transactions: [{
            transactionType: 'credit',
            amount: totalAmount,
            from: 'order cancellation',
            orderId,
          }],
        });
        await newWallet.save();
      } else {
        // Update existing user's wallet with a new transaction
        userWallet.balance += totalAmount;
        userWallet.transactions.push({
          transactionType: 'credit',
          amount: totalAmount,
          from: 'order cancellation',
          orderId,
        });
        await userWallet.save();
      }
  
      res.status(200).json({ updatedOrder });
    } catch (error) {
      res.status(500).json({ message: 'Failed to cancel order', error: error.message });
      console.error(error);
    }
  };
  
 // to cancelled orders (user)
const CancelledOrders = async (req,res)=>{

    const user = await users.findOne({email:req.session.email})
    const userId = user._id

    if(!userId){
        return res.status(404).json({message:'user not found'})
    }
    try {
        const userCancelledOrders = await orders.aggregate([
            {
                $match:{
                    userId:userId,
                    status:'Cancelled'
                }
            },
            {
                $unwind:'$products'
            },
            {
                $lookup:{
                    from:'products',
                    localField:'products.productId',
                    foreignField:'_id',
                    as:'productInfo'
                }
            },
            {
                $addFields:{
                    'products.productName' :{$arrayElemAt:['$productInfo.productName',0]},
                    'products.productBrand':{$arrayElemAt:['$productInfo.brand',0]},
                    'products.productPrice':{$arrayElemAt:['$productInfo.price',0]},
                    'products.productImage':{$arrayElemAt:['$productInfo.image',0]},
                }
            },
            {
                $project:{
                    'products.productName' :1,
                    'products.productBrand':1,
                    'products.productPrice':1,
                    'products.productImage':1,
                    'deliveryDate':1
                }
            },
            {
                $sort:{deliveryDate:-1}
            }
        ]).exec()

        const brandData = await brand.find()
        res.render('./user/myCancellations',{userCancelledOrders,brandData,title:'My Cancellation'})
        
    } catch (error) {
        console.error(error)
        next(error)
    }
    
}

// admin order details view 
const toAdminDetailedOrders = async (req,res)=>{
    const orderId = req.params.orderId

    try{
        const orderFound = await orders.findById(orderId)

        if(!orderFound){
            return res.status(401).json({message:'order not found',success:false})
        }

        const userOrderWithProducts = await orders.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(orderId)
                }
            },
            {
                $lookup:{
                    from:'addresses',
                    localField:'userId',
                    foreignField:'userId',
                    as:'addressInfo'
                }
            },
            {
                $unwind:'$addressInfo'
            },
            {
                $addFields:{
                    'addressinfoaddress':'$addressInfo.address'
                }
            },
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'userOrderedProducts'
                }
            },
            {
                $unwind: '$userOrderedProducts'
            },
            {
                $addFields: {
                    'userOrderedProducts.totalAmount': { $multiply: ['$userOrderedProducts.price', '$products.quantity'] }
                }
            },
            {
                $project: {
                    'userOrderedProducts.productName': 1,
                    'userOrderedProducts.image': 1,
                    'userOrderedProducts.price': 1,
                    'products.quantity': 1,
                    'userOrderedProducts.totalAmount': 1,
                    'userOrderedProducts.specifications': 1,
                    'userId': 1,
                    'status':1,
                    'address':1,
                    'addressinfoaddress':1
                }
            },
            {
                $lookup: {
                    from: 'users', // Assuming 'users' is the collection where user information is stored
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $addFields: {
                    userProfileImage: { $arrayElemAt: ['$userDetails.profileImage', 0] }
                }
            },
            {
                $project: {
                    'userOrderedProducts.productName': 1,
                    'userOrderedProducts.image': 1,
                    'userOrderedProducts.price': 1,
                    'userOrderedProducts.specifications': 1,
                    'products.quantity': 1,
                    'userOrderedProducts.totalAmount': 1,
                    'userAddress': 1,
                    'userProfileImage': 1,
                    'status':1,
                    'addressinfoaddress':1
                }
            }
            
        ]);
        console.log('userOrderWithProducts',userOrderWithProducts)
        userOrderWithProducts.forEach(data =>{
            data.addressinfoaddress.forEach(item =>{
                console.log('item',item.fullName)
            })
        })
        
        res.render('./admin/orderDetails',{orderFound,userOrderWithProducts, title:'Order Details'})

    }catch(err){
        console.log(err)
    }
}


// to get order status for progress
const getOrderStatus = async (req,res)=>{
    const orderId = req.params.orderId
    console.log('orderid is',orderId)

    try{
        const orderStatus = await orders.aggregate([
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(orderId)
                }
            },
            {
                $project:{
                    'status':1,
                    '_id':0
                }
            }
        ])

        console.log('orderstatus got',orderStatus)
        return res.status(200).json({orderStatus})

    }catch(err){
        console.error(err)
    }
}


// apply the coupon 
const applyCoupon = async (req, res) => {

    try {
        const { couponCode } = req.body; 

        if(!couponCode){
            return res.status(404).json({ message: 'Please provide a valid coupon code' });
        }

        const user = await users.findOne({ email: req.session.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user._id;

        const couponFound = await coupon.findOne({ code: couponCode });
        if (!couponFound) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

         // Check if the coupon can still be used based on its maxUsage limit
        if(couponFound.usages >= couponFound.maxUsage){
            return res.status(400).json({message:'Coupon usage limit exceeded'})
        }
        const totalPrice = await cartHelpers.totalCartAmount(userId);

        // checking if the user's total amount meet's the minimum required for the coupon
        if(totalPrice < couponFound.minimumAmount){
            return res.status(400).json({message:'Total amount does not meet the coupon requirements'})
        }

        const currentDate = new Date();
        if (currentDate < couponFound.startDate || currentDate > couponFound.endDate) {
            return res.status(400).json({ message: 'Coupon is not valid at the current date' });
        }

        // reduce the discount amount from the user's total amount
        const discountedAmount = Math.min(couponFound.discountAmount,totalPrice)
        const finalTotal = totalPrice - discountedAmount

        req.session.finalTotal = finalTotal
        // Update the coupon usage count and push the current timestamp to usageTime
        couponFound.usages++;
        couponFound.usageTime.push(Date.now())  // Push the current timestamp

        await couponFound.save()

        res.status(200).json({ success: true,discountedAmount, finalTotal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const toViewOrderDetails = async (req,res)=>{
    const orderId = req.params.orderId

    try{

        const userOrder = await orders.findById(orderId)
        if(!userOrder){
            return res.status(404).json({message:'Order not found'})
        }

        const orderedProducts = await orders.aggregate([
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(orderId)
                }
            },
            {
                $unwind:'$products'
            },
            {
                $lookup:{
                    from:'products',
                    localField:'products.productId',
                    foreignField:'_id',
                    as:'orderedProductInfo'
                }
            },
        ])
        console.log(orderedProducts)
        res.render('./user/orderDetails.ejs',{userOrderWithProducts:orderedProducts})

    }catch(err){
        console.error(err)
    }
}



module.exports = {
    placeOrder,
    orderSuccess,
    toUserOrders,
    cancelOrder,
    getOrderStatus,
    CancelledOrders,
    toAdminDetailedOrders,
    verifyPayment,
    applyCoupon,
    toViewOrderDetails

}
 