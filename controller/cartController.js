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
const coupon = require('../model/coupon')
// const { ObjectId } = require('mongodb')





// To cart
const toCart = async (req, res) => {

    const message = req.query.message;

    if(!req.session.email){
        return res.redirect('/user/tosignup')
    }
    const isAuthenticated = req.session.user ? true : false;
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
            return res.render('./user/emptyCart',{title:'Cart'})
        }

        const eachProductPrice = await cartHelpers.priceOfEachItem(userId)
        var firstCartItem = cartData[0];
        const cartTotal = firstCartItem.total
        
        const finalPrice = eachProductPrice.reduce((acc,current)=>{
            return acc + current.total
        },0);
        req.session.finalPrice = finalPrice
        res.render('./user/cart',{finalPrice,cartTotal,eachProductPrice,isAuthenticated,message,title:'Cart'});
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

        
        return res.status(200).json({ success: true, datas: productsInCart, cartData: uniqueProductDetails,productQty: productQuantity[0],cartId});
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const addToCart = async (req, res) => {
    try {

        const productId = req.body.productId ;
        const quantity = req.body.quantity

        if (!productId || !quantity) {
            return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
        }

        const userEmail = req.session.email;
        const user = await users.findOne({ email: userEmail });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userId = user._id;


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
            }else{
                 // If the cart exists, update it by pushing the new product
                cartItem.products.push({
                productId: productId,
                quantity: quantity
            });
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
            res.status(200).json({ message: 'Item deleted successfully', success: true });
        } else {
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
      

      const userEmail = req.session.email;
      const user = await users.findOne({ email: userEmail });
  
      if (!user) {
        return res.status(404).send('User not found');
      }

  
      const userCartData = await cart.aggregate([
        { $match: { userId: user._id } },
        {
          $unwind: '$products'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'userCartProducts'
          }
        },
        {
          $addFields: {
            'userCartProducts.quantity': '$products.quantity' // Retain quantity in userCartProducts
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
                  quantity: '$$product.quantity' // Include quantity in each product
                }
              }
            }
          }
        }
      ]).exec();


      let hasEnoughStock = true;

    for (const cartItem of userCartData) {
    const productsInCart = cartItem.userCartProducts; // Access 'userCartProducts'
    for (const product of productsInCart) { // Iterate through products in the cart
        const productId = product._id;
        const dbProduct = await products.findById(productId);
        
        if (!dbProduct || dbProduct.stock < product.quantity) {
        hasEnoughStock = false;
        break;
        }
    }
    }

    if (!hasEnoughStock) {
    return res.status(400).redirect(`/cart/cart?message=Insufficient stock for some products in the cart`);
    }






      const finalPrice = req.session.finalPrice
  
      const cartItems = userCartData.map(cartItem => cartItem.userCartProducts);
      const flattenedCartItems = [].concat(...cartItems);
  
      const userAddressData = await address.findOne({ userId: user._id });
      const userAddress = userAddressData ? userAddressData.address : null;
  
      const total = flattenedCartItems.reduce((acc, currentItem) => acc + currentItem.price, 0);
  
      res.render('./user/checkout', { userCartData, userAddress, total , quantity, finalPrice,title:'Checkout'})
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  };


  const updateQuantity = async (req,res)=>{
    try {
        const {cartId,productId,change} = req.body
        const user = await users.findOne({email:req.session.email})
        const userId = user._id

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
            const finalPriceAfterChange = await cartHelpers.totalCartAmount(userId)
            req.session.finalPrice = finalPriceAfterChange
            return res.json({success:true,finalPriceAfterChange,message:'quantity updated successfully'})
        }else{
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
    updateQuantity,
    
}