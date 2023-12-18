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


const placeOrder = async (req, res) => {
    try {
        // Retrieving user details
        const user = await users.findOne({ email: req.session.email });
        const userId = user._id;

        // Checking if request body contains necessary data
        if (!req.body) {
            return res.status(404).json({ message: 'Data not found in request' });
        }

        const { selectedAddress, selectedPaymentMethod, selectedShippingType, quantity, totalPrice } = req.body;
        console.log('ordered quantity',quantity)
        console.log('ordered totalPrice',totalPrice)

        // Calculating the grand total
        const grandTotal = totalPrice;

        // Getting products from cart aggregate
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

        // Processing each product in the cart
        for (const data of aggregateData) {
            for (const innerArray of data.productDetails) {
                const productId = innerArray._id;
                // const quantity = innerArray.quantity;
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
                        return res.status(400).json({ success: false, message: 'Insufficient stock for the product' });
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

        await newOrder.save();

        res.status(201).json({ success: true, message: 'Order created successfully', data: newOrder });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
};




const orderSuccess = (req,res)=>{
    res.render('./user/orderPlaced')
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
        'status':1
      }
    },
    {
      $group: {
        _id: '$_id', // Group by order ID
        productDetails: { $push: '$productDetails' }, // Push product details for the order
        quantity: { $sum: '$products.quantity' }, // Sum of quantities for the order
        totalAmount: { $first: '$totalAmount' }, // Retrieve totalAmount
        status: { $first: '$status' } // Retrieve status
      }
    }
  ]);
  
//   console.log('userOrders',userOrders);

  userOrders.forEach((obj)=>{
    obj.productDetails.forEach((item)=>{
        // console.log('item in userOrder',item)
    })
  })
  

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
                    'products.productImage':1
                }
            }
        ]).exec()

        const brandData = await brand.find()
        res.render('./user/myCancellations',{userCancelledOrders,brandData})
        
    } catch (error) {
        console.error(error)
        next(error)
    }
    
}






module.exports = {
    placeOrder,
    orderSuccess,
    toUserOrders,
    cancelOrder,
    CancelledOrders

}
 