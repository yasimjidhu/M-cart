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
const crypto = require('crypto')
const Razorpay = require('razorpay')
require('dotenv').config()


const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const placeOrder = async (req, res) => {
    try {
        // Retrieve user details
        const user = await users.findOne({ email: req.session.email });
        const userId = user._id;

        // Check if request body contains necessary data
        if (!req.body) {
            return res.status(404).json({ message: 'Data not found in request' });
        }

        const { selectedAddress, selectedPaymentMethod, selectedShippingType, quantity, totalPrice } = req.body;

        // Calculate the grand total
        const grandTotal = totalPrice;

        // const amountInRupees=Math.floor(grandTotal)

        // const amountInPaisa = Math.round(amountInRupees * 100);
        // console.log('amountInPaisa',amountInPaisa)

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

        // Creating a new order
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
        console.log('saved id or receipt',savedOrder._id)
        

        if(selectedPaymentMethod=='cashOnDelivery'){
            res.json({
                codSuccess:true,
                message:'order success'
            })
        }else if (selectedPaymentMethod === 'razorPay') {
            console.log('selectedPaymentMethod checking reached')
            const options = {
                amount: grandTotal * 100, // amount in paisa
                currency: 'INR',
                receipt: savedOrder._id, // Use the order ID as the receipt
            };

            const razorpayOrder = await instance.orders.create(options);
            console.log('razorPayorder',razorpayOrder)

            res.status(201).json({
                success: true,
                message: 'Razorpay order created successfully',
                data: {
                    order: savedOrder,
                    razorpayOrderId: razorpayOrder.id,
                    razorpayOptions: razorpayOrder,
                    online:true,
                }
            });
            console.log('razorpay order created and saved',)
        } else {
            res.status(201).json({ success: true, message: 'Order created successfully', data: savedOrder });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
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
    
    userOrders.forEach(order => {
      order.products.forEach((product, index) => {
        console.log(`Order ID: ${order._id}, Product ${index + 1} Quantity: ${product.quantity}, Total Cost: ${product.totalCost}`);
      });
    });
    
    res.render('./user/userOrders', { userOrders });
  };
  
  
 // cancel the order
 const cancelOrder = async (req,res)=>{
    const orderId = req.params.orderId

    try{
        const order = await orders.findById(orderId)

        // check if the order status is shipped
        if(order.status==='Shipped'){
            return res.status(400).json({message:'cannot cancel a shipped order'})
        }else if(order.status==='Cancelled'){
            return res.status(403).json({message:'This product you already cancelled'})
        }

         // Retrieve the products from the cancelled order
         const Products = order.products;
         console.log('PRoducts',Products)

         for (const product of Products) {
            console.log('product.productId',product.productId)
            // Find the corresponding product in the inventory by productId
            const inventoryProduct = await products.findById(product.productId);
            console.log('inventoryproduct',inventoryProduct)

            // Increment the quantity in the inventory by the cancelled quantity
            if (inventoryProduct) {
                inventoryProduct.stock += product.quantity;
                await inventoryProduct.save();
            }
        }
        console.log('stock increased')


        // Update the order status to 'Cancelled'
        const updatedOrder = await orders.findByIdAndUpdate(
            orderId,
            {$set:{status:'Cancelled'}},
            {new:true}
        );

        res.status(200).json({updatedOrder})
    }catch(error){
        res.status(500).json({ message: 'Failed to cancel order', error: error.message})
        console.error(error)
    }
 }

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
        console.log('userCancelledOrders',userCancelledOrders)
        res.render('./user/myCancellations',{userCancelledOrders,brandData})
        
    } catch (error) {
        console.error(error)
        next(error)
    }
    
}

// admin order details view 
const toAdminDetailedOrders = async (req,res)=>{
    console.log('called')
    const orderId = req.params.orderId

    try{
        const orderFound = await orders.findById(orderId)
        console.log('orderfound',orderFound)



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
                }
            },
            {
                $lookup: {
                    from: 'addresses',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'userAddress'
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
                    'status':1
                }
            }
        ]);

        


        console.log('userOrderWithProducts is',userOrderWithProducts)
        console.log('orderfound',orderFound)
   
        res.render('./admin/orderDetails',{orderFound,userOrderWithProducts})

       
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



module.exports = {
    placeOrder,
    orderSuccess,
    toUserOrders,
    cancelOrder,
    getOrderStatus,
    CancelledOrders,
    toAdminDetailedOrders,
    verifyPayment

}
 