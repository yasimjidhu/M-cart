const { json } = require('body-parser')
const cart = require('../model/cart')
const products = require('../model/productschema')
const router = require('../Router/cartRouter')
const session = require('express-session')
const users = require('../model/userSchema')
const { default: mongoose, set } = require('mongoose')
const { ObjectId } = require('mongoose');



// To cart
const toCart = async (req, res) => {
    if(!req.session.email){
        return res.redirect('/user/tosignup')
    }
    const userEmail = req.session.email;
    try {
        const userCart = await users.aggregate([
            {
                $match: {
                    email: userEmail
                }
            },
            {
                $lookup: {
                    from: 'carts',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'userCartItems'
                }
            },
            {
                $project: {
                    _id: 1,
                    products: 1,
                    userId: 1,
                    userCartItems: 1 // Include the 'userCartItems' field in the projection
                }
            }
        ]).exec();

        // console.log('usercartitems', userCart);
        const firstCartItem = userCart[0].userCartItems[0];
        // console.log('First cart item:', firstCartItem);
        res.render('./user/cart',firstCartItem);
    } catch (error) {
        console.log(error);
    }
};

//cart products
const cartProducts = async (req, res) => {
    try {

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
        const productsInCart = await products.find({ _id: { $in: productIds } }, { image: 1, price: 1 ,_id:1});
        // console.log('productsInCart',productsInCart)
        

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


// Remove Item from the cart


const RemoveItem = async (req, res) => {
    const productID = req.params.productID;
    const userEmail = req.session.email;
    
    try {
        const user = await users.findOne({ email: userEmail });
        const userId = user._id;

        const updatedCart = await cart.updateOne(
            { userId: userId },
            { $pull: { products: { productId: productID } } }
        );

        if (updatedCart) {
            console.log('success')
            res.status(200).json({ message: 'Item deleted successfully', success: true });
        } else {
            console.log('failed')
            res.status(404).json({ message: 'Product not found in the cart', success: false });
        }
    } catch (err) {
        console.log('Error occurred while removing product', err);
        res.status(500).json({ message: 'Internal server error', success: false });
    }
};


module.exports = {
    addToCart,
    toCart,
    cartProducts,
    RemoveItem
    
}