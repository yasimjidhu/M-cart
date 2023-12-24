const userModel = require('../model/userSchema')
const cart = require('../model/cart')


const getProductsArrayLength = async (email) => {
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
  
      const userProducts = await cart.find({ userId: user._id });
      if (userProducts.length > 0) {
        return userProducts[0].products.length||0
      } else {
        return 0;
      }
    } catch (error) {
      console.error('Error:', error);
      return 0;
    }
  };



module.exports = {
    getProductsArrayLength
}