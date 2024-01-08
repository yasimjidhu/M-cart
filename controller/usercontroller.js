const User = require("../model/userSchema");
const cart = require('../model/cart')
const cartFunctions = require('../global/cartFunctions')
const products = require("../model/productschema");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const router = require("../Router/userRouter");
const { transporter, sendOtp, generateOTP } = require("./otpcontroller");
const brands = require("../model/brands");
const category = require("../model/category");
require("dotenv").config();
const { VERIFYotp } = require('../controller/otpcontroller');
const Users = require("../model/userSchema");
const wallet = require('../model/wallet')
const referal = require('../model/referal')
const productOffer = require("../model/productOffer");
const cartHelpers = require('../helpers/cartHelpers')
const offerhelper = require('../helpers/offer');
const { query } = require("express");
const { default: mongoose } = require("mongoose");



// Function to get the unblocked products from brands
async function getProductsFromActiveBrands() {
  try {
    const activeBrands = await brands.find({ brandStatus: true }).select("_id");
    const activeBrandIds = activeBrands.map((brand) => brand._id);
    const productsFromActiveBrands = await products.find({
      brand: { $in: activeBrandIds },
    });
    return productsFromActiveBrands;
  } catch (error) {
    console.error(error);
    throw new Error("Cannot retrieve unblocked products");
  }
}

const toHome = async (req, res) => {
  try {

      

      const blockedBrands = await brands.find({ brandStatus: false }, { _id: 1 });
      const blockedBrandIds = blockedBrands.map((brand) => brand._id);

      const flashsales = await category.findOne({ CategoryName: "Flash Sales" });
      const premiumCategory = await category.findOne({ CategoryName: "Premium" });
      const bestSeller = await category.findOne({CategoryName:'Best seller'})

      const premiumProducts = premiumCategory ? await products.find({ category: premiumCategory._id , brand:{$nin:blockedBrandIds} }) : [];
      const flashsalesProducts = flashsales ? await products.find({ category: flashsales._id, brand:{$nin:blockedBrandIds} }) : [];
      const bestSellerProducts = bestSeller ? await products.find({category:bestSeller._id, brand:{$nin:blockedBrandIds}}):[];
      const brandData = await brands.find();

      const categories = await category.find()
      

      res.render("./user/userhome", {
        title: "Home",
        err: false,
        data: premiumProducts,
        brand: brandData,
        Category: premiumCategory,
        flashSales: flashsalesProducts,
        flashSalesId:flashsales?flashsales._id:null,
        bestSellerData: bestSellerProducts,
        categories

      });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).redirect("/admin/tosignup");
  }
};



//User signup
const userSignup = async (req, res, next) => {
  console.log("user signup");

  try {
    const { name, email, password } = req.body;
 
    const referedUser = req.session.referedUserId     
    if (!name || !email || !password) {
      return res.render("./user/usersignup", { msg: "Fill out the fields" });
    }

    const checkUser = await User.findOne({ email: email });

    if (checkUser) {
      req.session.err = "User already exists";
      return res.render("./user/usersignup", { msg: "User Already exists" });
    }

    let referredBy = null;

    if (referedUser) {
      const referrer = await User.findById(referedUser);
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const pass = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpTimestamp = Date.now(); // Store the timestamp

    const mailOptions = {
      from: "jidhuyasim@gmail.com",
      to: email,
      subject: "Your OTP for signup",
      text: `your OTP is ${otp}`,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        return res.render("./user/usersignup", {
          msg: "Failed to send otp via email",
        });
      } else {
        // Store the user's email, OTP, and referral info in the session for verification
        req.session.email = email;
        req.session.pass = pass;
        req.session.name = name;
        req.session.otp = otp;
        req.session.otpTimestamp = otpTimestamp;
        req.session.referredBy = referredBy; // Store the referral information

        return res.redirect("/verify-otp");
      }
    });
  } catch (error) {
    console.log(error);
    req.session.err = "Something went wrong";
    res.render("./user/usersignup");
    next(error);
  }
};

const toverifyotp = (req, res) => {
  res.render("./user/verifyotp");
};

const verifyOtp = async (req, res) => {
  try {
    const otp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
    const storedOtp = req.session.otp;
    const storedTimestamp = req.session.otpTimestamp
    const pass = req.session.pass;
    const isAuthenticated = req.session.user ? true : false;

    if(storedOtp && storedTimestamp){
      const currentTime = Date.now();
      const timeDifference = currentTime - storedTimestamp;
    
    if (otp ===  storedOtp && timeDifference <= 5 * 60 * 1000) {
      req.session.userlogged = true;

      const { email, name, referredBy } = req.session;

      const newUser = new User({
        email: req.session.email,
        password: pass,
        name: req.session.name,
        referredBy: referredBy, 
      });

      await newUser.save();
      
      // find the refered user wallet and give him the necessary rewards
      const userWallet = await wallet.findOne({userId:referredBy})

      if(!userWallet){
        // if the wallet is doesn't exist for the user create it 
        const newWallet = new wallet({
          userId:referredBy,
          balance:50,
          transactions:[{
            transactionType:'credit',
            amount:50,
            from:'Referal reward',
            date:new Date()
          }]
        });

        await newWallet.save()

      }else{
        // if the refered user has wallet increment the balance
        userWallet.balance += 50;
        userWallet.transactions.push({
          transactionType:'credit',
          amount:50,
          from:'Referal reward',
          date:new Date()
        });

        await userWallet.save()
      }

      // SET THE REFERED DETAILS TO THE REFERAL MODEL
      const newReferal = new referal({
        offerAmount:50,
        updatedDate:new Date(),
        status:true,
        joinedUser:[
          {userId:newUser._id},
        ],
        invitedUser:[
          {userId:referredBy},
        ]
      });

      await newReferal.save()

      const bestSeller = await category.findOne({CategoryName:'Best seller'})

      const flashsales = await category.findOne({
        CategoryName: "Flash Sales",
      });
      const premiumCategory = await category.findOne({
        CategoryName: "Premium",
      });
      

      if (premiumCategory || flashsales) {
        // Fetch products that belong to the "Premium" category using the category "_id"
        
        const blockedBrands = await brands.find({ brandStatus: false });
        const blockedBrandIds = blockedBrands.map((brand) => brand._id);

        
        const premiumProducts = await products.find({
          category: premiumCategory._id,
        });
        const flashsalesProducts = await products.find({
          category: flashsales.id,
        });
        const categorywise = await products.find();

        const bestSellerProducts = bestSeller ? await products.find({category:bestSeller._id, brand:{$nin:blockedBrandIds}}):[];
        const brand = await brands.find();
        const categories = await category.find()
        

        res.render("./user/userhome", {
          title: "Home",
          err: false,
          data: premiumProducts,
          brand,
          Category: premiumCategory,
          flashSales: flashsalesProducts,
          flashSalesId:flashsales?flashsales._id:null,
          bestSellerId:bestSeller?bestSeller._id:null,
          bestSellerData:bestSellerProducts,
          isAuthenticated,
          categories,
        });
      } else {
        // Handle if Premium category is not found
        res.status(404).send("Premium category not found");
      }
    } else {
      console.log("Invalid or expired OTP");
      res.render("./user/verifyotp", { msg: "Invalid or expired OTP", err: "errorfound" });
    }
  }
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.render("./user/usersignup", { msg: "Error during OTP verification" });
  }
};

// Function to resend OTP during signup verification
const resendSignupOTP = async (req, res) => {
  try {
    console.log("iam the session otp ", req.session.email);
    const email = req.session.email; // Assuming you stored the user's email in the session
    console.log("iam email bro", email);
    if (!email) {
      return res
        .status(400)
        .render("./user/verifyotp", { msg: "Email not found in session" });
    }

    // Generate a new OTP for signup
    const newSignupOTP = generateOTP();

    // Send the new OTP via email
    await sendOtp(email, newSignupOTP); // Assuming sendOtp function handles sending emails

    // Update the session with the new OTP
    req.session.otp = newSignupOTP;

    return res.status(200).render("./user/verifyotp", {
      message: "New OTP for signup sent successfully",
    });
  } catch (error) {
    console.error("Error while resending signup OTP:", error);
    return res
      .status(500)
      .render("./user/usersignup", { msg: "Failed to resend signup OTP" });
  }
};

// guest User Login
const indextologin = (req, res, next) => {
  res.render("./user/userlogin", { title: "Guest Login" });
};

// User Login
const userLogin = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    if (check !== null) {
      const isMatch = await bcrypt.compare(req.body.password, check.password);
      if (isMatch) {
        if (check.status == true) {
          req.session.user = check.name;
          req.session.userlogged = true;
          req.session.email = req.body.email;
          return res.json({ success: true });
        } else {
          return res.json({ success: false, err: "Access Denied" });
        }
      } else {
        return res.json({ err: "invalid password" });
      }
    } else {
      return res.json({ success: false });
    }
  } catch (error) {
    return res.json({ success: false, err: "invalid username or password" });
  }
};

const userlog = async (req, res) => {
  try {
    const user = await Users.findOne({email:req.session.email})
    const userId = user._id

    const offerProducts = await cart.aggregate([
      {
        $match:{
          userId:userId
        }
      },
      {
        $unwind:'$products'
      },
      {
        $lookup:{
          from:'productoffers',
          localField:'products.productId',
          foreignField:'productId',
          as:'offerInfo'
        }
      },
      {
        $project: {
          'offerInfo.OfferPercentage': '$offerInfo.OfferPercentage' // Adjust this line
        }
      }
    ]);
    
    offerProducts.forEach(item => {
      item.offerInfo.forEach(value =>{
        console.log('value of percentage',value.OfferPercentage)
      })
    });


    const isLoggedIn = req.session.userlogged || req.user;
    const isAuthenticated = req.session.user ? true : false;

    if (isLoggedIn) {
      const blockedBrands = await brands.find({ brandStatus: false });
      const blockedBrandIds = blockedBrands.map((brand) => brand._id);

      const flashsales = await category.findOne({ CategoryName: "Flash Sales" });
      const premiumCategory = await category.findOne({ CategoryName: "Premium" });
      const bestSeller = await category.findOne({CategoryName:'Best seller'})

      const flashsalesProducts = flashsales ? await products.find({ category: flashsales._id, brand: { $nin: blockedBrandIds } }): [];
      const premiumProducts = premiumCategory ? await products.find({ category: premiumCategory._id, brand: { $nin: blockedBrandIds } }): [];
      const bestSellerProducts = bestSeller ? await products.find({category:bestSeller._id, brand:{$nin:blockedBrandIds}}):[];
      const brandData = await brands.find();

      const categories = await category.find()

        let cartItemsCount = 0
        const userEmail = req.session.email
        await cartFunctions.getProductsArrayLength(userEmail)
        .then((productsArrayLength)=>{
          cartItemsCount = productsArrayLength
        })
        .catch((err)=>{
          console.error('error',err)
        })

        
      res.render("./user/userhome", {
        title: "Home",
        err: false,
        data: premiumProducts,
        brand: brandData,
        Category: premiumCategory,
        flashSales: flashsalesProducts,
        flashSalesId:flashsales?flashsales._id:null,
        bestSellerId:bestSeller?bestSeller._id:null,
        bestSellerData:bestSellerProducts,
        isAuthenticated,
        cartItemsCount,
        categories,
        // percentage
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).redirect("/admin/tosignup");
  }
};





// Signup to Login
const signupToLogin = (req, res, next) => {
  res.render("./user/userlogin", { title: "login", err: false });
};

// To Signup page
const toSignup = (req, res) => {

  const error = req.query.msg
  const referedUserId = req.query.userId
  req.session.referedUserId = referedUserId
  
  if (req.session.userlogged) {
    res.redirect("/user/home");
  } else {
    res.render("./user/usersignup", { title: "Signup", err: false,error });
  }
};

// User Logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      res.send("error");
    } else {
      res.redirect("/user/indextologin");
    }
  });
};

// USer product details
const productview = async (req, res) => {
  try {

    const productId = req.params.id;
    const isAuthenticated = req.session.user ? true : false;

    let actualOfferPrice ;
    let percentage ;

    const data = await products.find({ _id: productId });
    const offerPrice = await cartHelpers.actualPriceAfterOffer(productId)
    if(offerPrice){
      offerPrice.forEach(value =>{
          actualOfferPrice = value.discountedAmount
          percentage = value.offerPercentage
      })
    }
    req.session.percentage = percentage

    if (!data) {
      return res.status(404).send("product not found");
    } else {
      res.render("./user/productdetails", { data,offerPrice,actualOfferPrice,percentage,isAuthenticated });
    }
  } catch (err) {
    res.status(500).send("An error occured");
    console.log("error occured");
    console.log(err);
  }
};

// Product list page
const productlist = async (req, res) => {
  try {
    const isAuthenticated = req.session.user ? true : false;
    let data = await products.find();
    res.render("./user/productlist", { title: "Products", data,isAuthenticated });
  } catch (e) {
    console.log(e);
    res.status(500).send("internet server error");
  }
};

// To brandwise productions
const toBrandwise = async (req, res) => {
  const brandid = req.params.brandId;
  const isAuthenticated = req.session.user ? true : false;

  const brandProducts = await products.find({ brand: brandid });
  const Brand = await brands.find();
  res.render("./user/brandwise", { brandProducts, Brand,isAuthenticated });
};
async function filterByBrand(req, res) {
  const brandName = req.query.brand;
  console.log(brandName);
  const filteredData = await products.find({ brand: brandName });

  res.json({ brand: filteredData });
}

const toViewAll = async (req, res) => {
  const categoryId = req.params.categoryId;
  // console.log(".......................", categoryId);

  try {
    const isAuthenticated = req.session.user ? true : false;
    const productData = await products.find({ category: categoryId });
    // console.log("Category:", productData);

    if (productData) {
      res.render("./user/viewall", { productData ,isAuthenticated});
    } else {
      res.redirect("/user/home");
    }
  } catch (error) {
    // Handle potential errors such as database errors or other issues
    console.error("Error fetching category:", error);
    res.status(500).send("Internal Server Error");
  }
};

// User search products
const productSearch = async (req, res) => {
  try {
    const searchItem = req.body.usersearch.toLowerCase();

    // search for products using a case sensitive regex match on the product name
    const foundProducts = await products.find({
      productName: { $regex: new RegExp(searchItem, "i") },
    });
    res.render("./user/searchResults", { Products: foundProducts, searchItem });
  } catch (error) {
    res.status(500).redirect("/user/home");
    console.log(error);
  }
};

// filter the products

const getFilteredProducts = async (req, res) => {
  try {
    console.log(req.query)
    const { priceRanges } = req.query; // Retrieve priceRanges from query parameters
    console.log('priceRanges', priceRanges);

    // Parse the priceRanges string into an array of price range objects
    const priceRangeArray = priceRanges.split(',').map(range => {
      const [min, max] = range.split('-').map(Number); // Split the range and convert values to numbers
      return { price: { $gte: min, $lte: max } }; // Create MongoDB $gte and $lte criteria for the range
    });

    // Construct the query to find products within the specified price ranges
    const filteredProducts = await products.find({ $or: priceRangeArray });

    res.status(200).json({ success: true, filteredProducts });
  } catch (error) {
    console.error('Error fetching filtered products:', error);
    res.status(500).json({ success: false, error: 'Error fetching filtered products' });
  }
};

// Backend route to filter products by brand
const filterProductsByBrand = async (req, res) => {
  const { brandRanges } = req.query;

  try {
    const brandArray = Array.isArray(brandRanges) ? brandRanges : [brandRanges];

    const brandWiseData = await brands.aggregate([
      {
        $match: {
          brandName: { $in: brandArray }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'brand',
          as: 'brandDetails'
        }
      },
      {
        $project: {
          'brandDetails.productName': 1,
          'brandDetails.image': 1,
          'brandDetails.price': 1,
          'brandDetails._id': 1
        }
      }
    ]);

    res.status(200).json({ success: true, brandWiseData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const toProfile = (req,res)=>{
  res.render('./user/profile')
}


// to wallet
const toWallet = async (req,res)=>{
  
  try {
    const user = await User.findOne({email:req.session.email})
    const userId = user._id

    const userWallet = await wallet.findOne({userId:userId})
    console.log(userWallet)

    res.render('./user/wallet.ejs',{userWallet})  

  } catch (err) {
    console.error(err)
  }
}


// To referal
const toReferal = async (req,res)=>{
  
  const user = await User.findOne({email:req.session.email})
  const userId = user._id

  try{
    const referalLink = await offerhelper.generateReferralCode(userId)
    res.render('./user/referal.ejs',{referalLink})
  }catch(err){
    console.error(err)
  }

}



module.exports = {
  toHome,
  userSignup,
  indextologin,
  userLogin,
  signupToLogin,
  toSignup,
  userlog,
  logout,
  productview,
  productlist,
  toverifyotp,
  verifyOtp,
  resendSignupOTP,
  toBrandwise,
  filterByBrand,
  toViewAll,
  productSearch,
  toProfile,
  getFilteredProducts,
  filterProductsByBrand,
  toWallet,
  toReferal
};
