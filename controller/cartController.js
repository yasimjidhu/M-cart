const { json } = require('body-parser')
const cart = require('../model/cart')
const products = require('../model/productschema')
const address = require('../model/address')
const router = require('../Router/cartRouter')
const session = require('express-session')
const users = require('../model/userSchema')
const cartHelpers = require('../helpers/cartHelpers')
const { default: mongoose, set } = require('mongoose')
const { ObjectId } = require('mongoose');
// const { ObjectId } = require('mongodb')





// To cart
const toCart = async (req, res) => {
    if(!req.session.email){
        return res.redirect('/user/tosignup')
    }
    const userEmail = req.session.email;
    const user = await users.findOne({email:userEmail})
    const userId= user._id
    try {
        const cartData = await cart.aggregate([
            {
                $match:{userId:userId}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.productId',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from:'products',
                    localField:"item",
                    foreignField:'_id',
                    as:'cartItems'
                }
            },
            {
                $project:{
                    item:1,
                    quantity:1,
                    product:{$arrayElemAt:['$cartItems',0]}
                }
            },
            {
                $group:{
                    _id:null,
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }
        ]).exec()

        if(cartData.length<=0){
            return res.render('./user/emptyCart')
        }

        const eachProductPrice = await cartHelpers.priceOfEachItem(userId)
        console.log('eachProductPrice',eachProductPrice)
        

        // console.log('usercartitems', userCart);
        var firstCartItem = cartData[0];
        const cartTotal = firstCartItem.total
        console.log('cartdata',cartData)
        res.render('./user/cart',{cartTotal});
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

        const cartId = cartItemsForUser._id
        console.log('cartID',cartId)

        // Extracting product ids and quantities from the user's cart
        const productDetails = cartItemsForUser.products.map(product => ({
            productId: product.productId,
            quantity: product.quantity
        }));

        // Remove duplicate productIds if any
        const uniqueProductDetails = [...new Map(productDetails.map(item => [item.productId.toString(), item])).values()];
        const productIds = uniqueProductDetails.map(product => product.productId);
        const productQuantity =  uniqueProductDetails.map(product => product.quantity)

        // Fetch products based on the array of productIds
        const productsInCart = await products.find({ _id: { $in: productIds } }, { image: 1, price: 1 ,_id:1});
        // console.log('productsInCart',productsInCart)
        
        return res.status(200).json({ success: true, datas: productsInCart, cartData: uniqueProductDetails,productQty: productQuantity[0],cartId});
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
        console.log("user",user)
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userId = user._id;
        console.log('userId',userId)

        const cartItem = await cart.findOne({ userId :userId});

        if (cartItem===null) {
            // If the cart doesn't exist for the user, create a new cart and add the product
            const newCartItem = new cart({
                userId: userId,
                products: [{
                    productId:productId,
                    quantity: quantity
                }]
            });
            await newCartItem.save();
            return res.json({message:'product added to cart',success:true})

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


//checkout
const toCheckout = async (req, res) => {
    try {
      const quantity = req.query.quantity;
      const totalPrice = req.query.total;
      console.log('hey quantity',quantity)
      console.log('hey totalPrice',totalPrice)
      const userEmail = req.session.email;
      const user = await users.findOne({ email: userEmail });
  
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      const userCartData = await cart.aggregate([
        { $match: { userId: user._id } },
        { $project: { products: 1, _id: 0 } },
        { $unwind: '$products' },
        {
          $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'userCartProducts'
          }
        },
        {
          $project: {
            userCartProducts: {
              $map: {
                input: '$userCartProducts',
                as: 'product',
                in: {
                  _id: '$$product._id',
                  productName: '$$product.productName',
                  price: '$$product.price',
                  image: '$$product.image',
                }
              }
            }
          }
        }
      ]).exec();
  
      const cartItems = userCartData.map(cartItem => cartItem.userCartProducts);
      const flattenedCartItems = [].concat(...cartItems);
  
      const userAddressData = await address.findOne({ userId: user._id });
      const userAddress = userAddressData ? userAddressData.address : null;
  
      const total = flattenedCartItems.reduce((acc, currentItem) => acc + currentItem.price, 0);
  
      res.render('./user/checkout', { userCartData, userAddress, total , quantity, totalPrice})
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  };


  const updateQuantity = async (req,res)=>{
    try {
        const {cartId,productId,change} = req.body
        console.log('cartId',cartId)
        console.log('productId',productId)
        console.log('change',change)

        const updatedCart = await cart.updateOne(
            {
                _id:cartId,
                'products.productId':productId,
            },
            {
                $inc:{'products.$.quantity':change}// Increment or decrement the quantity based on 'change' value
            },
            {new:true}
        );

        if(updatedCart){
            console.log('quantity updated')
            return res.json({success:true,message:'quantity updated successfully'})
        }else{
            console.log('cart not found or not updated')
            return res.status(404).json({success:false,message:'Cart not found or not updated'})
        }


    } catch (error) {
        console.error(error)
        return res.status(500).json({success:false,error:error.message})
    }
  }



module.exports = {
    addToCart,
    toCart,
    cartProducts,
    RemoveItem,
    toCheckout,
    updateQuantity
    
}