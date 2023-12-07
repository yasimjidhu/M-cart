const { json } = require('body-parser')
const cart = require('../model/cart')
const products = require('../model/productschema')
const router = require('../Router/cartRouter')
const session = require('express-session')
const users = require('../model/userSchema')
const { default: mongoose, set } = require('mongoose')
const { ObjectId } = require('mongodb')


// To cart
const toCart = async (req,res)=>{
    try {
        res.render('./user/cart')
    } catch (error) {
        console.log(error)
    }
}

//cart products
const cartProducts = async (req, res) => {
    try {
        // Get the user's email from the session
        const userEmail = req.session.email;

        // Find the user by email to retrieve their ID
        const user = await users.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userId = user._id;

        // Fetch cart items for the user based on the user ID
        const cartItemsForUser = await cart.findOne({ userId });

        if (!cartItemsForUser) {
            return res.json({ success: true, datas: [], cartData: [] }); // Return empty cart for the user if no items found
        }

        // Extracting product ids and quantities from the user's cart
        const productDetails = cartItemsForUser.products.map(product => ({
            productId: product.productId,
            quantity: product.quantity
        }));

        // Remove duplicate productIds if any
        const uniqueProductDetails = [...new Map(productDetails.map(item => [item.productId.toString(), item])).values()];
        const productIds = uniqueProductDetails.map(product => product.productId);

        // Fetch products based on the array of productIds
        const productsInCart = await products.find({ _id: { $in: productIds } }, { image: 1, price: 1 });
        console.log('products in cart',productsInCart)
        console.log('qty in cart',uniqueProductDetails)
        

        return res.json({ success: true, datas: productsInCart, cartData: uniqueProductDetails });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const addToCart = async (req, res) => {
    try {

        const productId = req.body.productId ;
        const quantity = req.body.quantity;

        if (!productId || !quantity) {
            return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
        }

        const userEmail = req.session.email;
        const user = await users.findOne({ email: userEmail });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userId = user._id;

        const cartItem = await cart.findOne({ userId });

        if (!cartItem) {
            // If the cart doesn't exist for the user, create a new cart and add the product
            const newCartItem = new cart({
                userId: userId,
                products: [{
                    productId:new ObjectId(productId),
                    quantity: quantity
                }]
            });
            await newCartItem.save();

        } else {

            // if the cart is existing and the product is already exist in the cart
            const existingProduct = cartItem.products.find(product =>product.productId.toString()===productId)

            if(existingProduct){
                existingProduct.quantity += quantity
                console.log('quantity incremented')
            }else{
                 // If the cart exists, update it by pushing the new product
                cartItem.products.push({
                productId: productId,
                quantity: quantity
            });
            console.log('product added to cart')
            }
            await cartItem.save();
        }

        return res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
        console.log('Failed to add the product to the cart', error);
        res.status(500).json({ success: false, message: 'Failed to add product to cart' });
    }
};




module.exports = {
    addToCart,
    toCart,
    cartProducts,
    
}