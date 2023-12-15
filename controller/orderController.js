const { json } = require('body-parser')
const cart = require('../model/cart')
const products = require('../model/productschema')
const address = require('../model/address')
const orders = require('../model/orders')
const router = require('../Router/cartRouter')
const session = require('express-session')
const users = require('../model/userSchema')
const { default: mongoose, set } = require('mongoose')
const { ObjectId } = require('mongoose');


const placeOrder = async (req, res) => {
    try {
        const user = await users.findOne({ email: req.session.email });
        const userId = user._id;

        if (!req.body) {
            return res.status(404).json({ message: 'Data not found in request' });
        }

        const { selectedAddress, selectedPaymentMethod, selectedShippingType, totalPrice } = req.body;
        console.log('selectedAddress', selectedAddress);
        console.log('selectedPaymentMethod', selectedPaymentMethod);
        console.log('selectedShippingType', selectedShippingType);

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
                    totalAmount: { $sum: { $multiply: ['$products.quantity', { $arrayElemAt: ['$productDetails.price', 0] }] } },
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

        const grandTotal = aggregateData.length > 0 ? totalPrice : 0;
        const deliveryDate = new Date();
        const productsArray = [];

        for (const data of aggregateData) {
            for (const innerArray of data.productDetails) {
                const productId = innerArray._id;
                const quantity = innerArray.quantity;
                const price = innerArray.price[0];

                try {
                    // Update product stock...
                    
                    // Remove ordered items from the cart after placing the order
                    const removedItem = await cart.findOneAndUpdate(
                        { userId: userId },
                        { $pull: { products: { productId } } }, // Remove the product from the cart
                        { multi: true } // Update all matching documents
                    );

                    // Check if the item was removed from the cart successfully
                    if (removedItem) {
                        console.log(`Product with ID ${productId} removed from the cart.`);
                    } else {
                        console.log(`Product with ID ${productId} not found in the cart.`);
                        // Handle the situation where the item was not found in the cart
                    }

                    productsArray.push({
                        productId,
                        quantity,
                        price
                    });

                } catch (error) {
                    console.error(`Failed to remove product with ID ${productId} from the cart: ${error}`);
                    // Handle the error as needed
                }
            }
        }

        const newOrder = new orders({
            // ... (other order details)
            products: productsArray
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






module.exports = {
    placeOrder,
    orderSuccess

}
 