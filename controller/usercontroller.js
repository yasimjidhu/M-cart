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
const feedbacks = require('../model/feedback')
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
const categoryOffer = require("../model/categoryOffer");
const banners = require('../model/banner')



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

    const offeredProducts = await products.aggregate([
      {
        $lookup:{
          from:'productoffers',
          localField:'_id',
          foreignField:'productId',
          as:'offerProducts'
        }
      },
      {
        $lookup:{
          from:'categoryoffers',
          localField:'category',
          foreignField:'categoryId',
          as:'productsWithCategoryOffer'
        }
      },
     {
      $project:{
        '_id':1,
        'category':1,
        'offerType':1,
        'offerProducts':1,
        'productsWithCategoryOffer':1
      }
     }
    ]);

    
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
      const allBanners = await banners.find()
      

      res.render("./user/userhome", {
        title: "Home",
        err: false,
        data: premiumProducts,
        brand: brandData,
        Category: premiumCategory,
        flashSales: flashsalesProducts,
        flashSalesId:flashsales?flashsales._id:null,
        bestSellerData: bestSellerProducts,
        categories,
        offeredProducts,
        allBanners

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
    const storedTimestamp = req.session.otpTimestamp;
    const pass = req.session.pass;
    const isAuthenticated = req.session.user ? true : false;

    if (storedOtp && storedTimestamp) {
      const currentTime = Date.now();
      const timeDifference = currentTime - storedTimestamp;

      if (otp === storedOtp && timeDifference <= 5 * 60 * 1000) {
        req.session.userlogged = true;

        const { email, name, referredBy } = req.session;

        const newUser = new User({
          email: req.session.email,
          password: pass,
          name: req.session.name,
          referredBy: referredBy || null, // Use null if referredBy is not defined
        });

        await newUser.save();

        // find the referred user wallet and give him the necessary rewards
        if (referredBy) {
          const userWallet = await wallet.findOne({ userId: referredBy });
          const referalData = await referal.find();
          const offerAmount = referalData[0].offerAmount;

          if (!userWallet) {
            // if the wallet doesn't exist for the user, create it
            const newWallet = new wallet({
              userId: referredBy,
              balance: offerAmount,
              transactions: [
                {
                  transactionType: 'credit',
                  amount: offerAmount,
                  from: 'Referral reward',
                  date: new Date(),
                },
              ],
            });

            await newWallet.save();
          } else {
            // if the referred user has a wallet, increment the balance
            userWallet.balance += offerAmount;
            userWallet.transactions.push({
              transactionType: 'credit',
              amount: offerAmount,
              from: 'Referral reward',
              date: new Date(),
            });

            await userWallet.save();
          }

          // SET THE REFERRED DETAILS TO THE REFERRAL MODEL
          const newReferral = new referal({
            updatedDate: new Date(),
            status: true,
            joinedUser: [{ userId: newUser._id }],
            invitedUser: [{ userId: referredBy }],
          });

          await newReferral.save();
        }

       res.redirect('/home')

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

    const offeredProducts = await products.aggregate([
      {
        $lookup:{
          from:'productoffers',
          localField:'_id',
          foreignField:'productId',
          as:'offerProducts'
        }
      },
      {
        $lookup:{
          from:'categoryoffers',
          localField:'category',
          foreignField:'categoryId',
          as:'productsWithCategoryOffer'
        }
      },
     {
      $project:{
        '_id':1,
        'category':1,
        'offerType':1,
        'offerProducts':1,
        'productsWithCategoryOffer':1
      }
     }
    ]);

  
    // to get all product offered smartphones
    const isLoggedIn = req.session.userlogged || req.user;
    const isAuthenticated = req.session.user ? true : false;

    if (isLoggedIn) {
      const blockedBrands = await brands.find({ brandStatus: false });
      const blockedBrandIds = blockedBrands.map((brand) => brand._id);

      const flashsales = await category.findOne({ CategoryName: "Flash Sales" });
      const premiumCategory = await category.findOne({ CategoryName: "Premium" });
      const bestSeller = await category.findOne({CategoryName:'Best Seller'})

      const flashsalesProducts = flashsales ? await products.find({ category: flashsales._id, brand: { $nin: blockedBrandIds } }): [];
      const premiumProducts = premiumCategory ? await products.find({ category: premiumCategory._id, brand: { $nin: blockedBrandIds } }): [];
      const bestSellerProducts = bestSeller ? await products.find({category:bestSeller._id, brand:{$nin:blockedBrandIds}}):[];
      console.log('best seller data',bestSellerProducts)
      const brandData = await brands.find();

      const categories = await category.find()
      const allBanners = await banners.find()
      console.log('all banners',allBanners)

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
        offeredProducts,
        allBanners
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


// to about page
const toAbout = (req,res)=>{
  const isAuthenticated = req.session.user ? true : false;
  res.render('./user/about.ejs',{title:'ABout',isAuthenticated})
}

// to contact page
const toContact = (req,res)=>{
  const isAuthenticated = req.session.user ? true : false;
  res.render('./user/contact.ejs',{isAuthenticated,title:'Contact'})
}

// post contact(feedback)
const submitFeedback = async (req,res)=>{
  try{

    const user = await User.findOne({email:req.session.email})
    const userId = user._id

    const {name,email,subject,message} = req.body

    if(!name||!email||!subject||!message){
      return res.status(400).json({message:'error occured'})
    }

    let existingFeedback = await feedbacks.findOne({userId:userId})

    if(!existingFeedback){
      existingFeedback = new feedbacks({
        userId:userId,
        name:name,
        email:email,
        allFeedbacks:[]
      });

      await existingFeedback.save()
    }

    const newFeedback = {
      subject:subject,
      message:message,
      sentDate:new Date()
    }
    
    existingFeedback.allFeedbacks.push(newFeedback)
    await existingFeedback.save()

    return res.status(200).json({success:true,message:'successfully sent the feedback to the respective authority '})

  }catch(err){
    console.log(err)
    return res.status(500).json({success:false,message:'internal server error'})
  }
}

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
    res.redirect("/home");
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
      res.redirect("/indextologin");
    }
  });
};

// USer product details
const productview = async (req, res) => {
  try {

    const productId = req.params.id;
  
    const isAuthenticated = req.session.user ? true : false;

    let percentage ;
    let discountedPrice;
    let originalPrice;

    const data = await products.find({ _id: productId });
    originalPrice = data[0].price
    discountedPrice = data[0].discountedPrice

    const offerPrice = await cartHelpers.actualPriceAfterOffer(productId)
  


    if(offerPrice){
      offerPrice.forEach(value =>{
          percentage = value.offerPercentage
      })
    }
    req.session.percentage = percentage

    if (!data) {
      return res.status(404).send("product not found");
    } else {
      res.render("./user/productdetails", { data,originalPrice,discountedPrice,percentage,isAuthenticated,title:'Product View' });
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
    res.status(500).send("internal server error");
  }
};

const toBrandwise = async (req, res) => {
  const brandid = req.params.brandId;
  const isAuthenticated = req.session.user ? true : false;

  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const pageSize = 10; // Number of items per page

  // Calculate the number of items to skip based on the page number
  const skip = (page - 1) * pageSize;

  // Fetch total count of brand products
  const totalCount = await products.countDocuments({ brand: brandid });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch brand products with pagination
  const brandProducts = await products
    .find({ brand: brandid })
    .skip(skip)
    .limit(pageSize)
    .exec();

  // Fetch all brands (assuming this is used for some dropdown or other UI elements)
  const Brand = await brands.find();

  res.render("./user/brandwise", { brandProducts, Brand, isAuthenticated, currentPage: page, totalPages });
};



async function filterByBrand(req, res) {
  const brandName = req.query.brand;
  console.log(brandName);
  const filteredData = await products.find({ brand: brandName });

  res.json({ brand: filteredData });
}

const toViewAll = async (req, res) => {
  const categoryId = req.params.categoryId;
  const itemsPerPage = 10; 
  let page = req.query.page || 1;

  try {
    const isAuthenticated = req.session.user ? true : false;
    const skip = (page - 1) * itemsPerPage;

    const totalProducts = await products.countDocuments({ category: categoryId });
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    const productData = await products
      .find({ category: categoryId })
      .skip(skip)
      .limit(itemsPerPage);

    if (productData.length > 0) {
      res.render("./user/viewall", { productData, isAuthenticated, currentPage: page, totalPages });
    } else {
      res.redirect("/home");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


// User search products
const productSearch = async (req, res) => {
  try {
    const isAuthenticated = req.session.user ? true : false;
    const searchItem = req.body.usersearch.toLowerCase();

    // search for products using a case sensitive regex match on the product name
    const foundProducts = await products.find({
      productName: { $regex: new RegExp(searchItem, "i") },
    });
    res.render("./user/searchResults", { Products: foundProducts, searchItem ,isAuthenticated});
  } catch (error) {
    res.status(500).redirect("/home");
    console.log(error);
  }
};



// Controller function to handle product filtering
const filterProducts = async (req, res) => {
  try {
    console.log('filter reached')
    const isAuthenticated = req.session.user ? true : false;
    const { brands, priceRanges,sort} = req.query; // Use req.query to get parameters from the URL

    let query = {};

    if (brands && brands.length > 0) {
      query.brand = { $in: brands.split(',') };
    }

    if (priceRanges && priceRanges.length > 0) {
      const priceQueries = priceRanges.split(',').map(range => {
        const [minPrice, maxPrice] = range.split('-').map(Number);
        return { price: { $gte: minPrice, $lte: maxPrice } };
      });

      query.$or = priceQueries;
    }

    // Add sorting based on the 'sort' query parameter
    const sortOption = getSortOption(sort)

    // Fetch products based on filters
    const filteredProducts = await products.find(query).sort(sortOption)

    return res.status(200).json(filteredProducts); // Return filtered products as JSON
  } catch (error) {
    console.error('Error fetching filtered products:', error);
    res.status(500).json({ message: 'Failed to fetch filtered products' });
  }
};


// functon to get sorting option based on the provided value
function getSortOption(sort){
  switch(sort){
    case 'priceLowToHigh':
      return {price:1};
    case 'priceHighToLow':
      return {price:-1};
    case 'newestFirst':
      return {createdAt:-1};
    case 'oldestFirst':
      return {createdAt:1}
    default:
      return {}
  }
}



const toProfile = (req,res)=>{
  const isAuthenticated = req.session.user ? true : false;
  res.render('./user/profile',{isAuthenticated})
}


// to wallet
const toWallet = async (req, res) => {
  try {
    const isAuthenticated = req.session.user ? true : false;
    const user = await User.findOne({ email: req.session.email });
    const userId = user._id;

    const userWallet = await wallet
      .findOne({ userId: userId })
      .sort({ "transactions.date": -1 });
    console.log(userWallet);

    res.render('./user/wallet.ejs', { userWallet,isAuthenticated });
  } catch (err) {
    console.error(err);
  }
};



// To referal
const toReferal = async (req,res)=>{
  
  const user = await User.findOne({email:req.session.email})
  const userId = user._id
  const isAuthenticated = req.session.user ? true : false;

  try{
    const referalLink = await offerhelper.generateReferralCode(userId)
    res.render('./user/referal.ejs',{referalLink,isAuthenticated})
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
  toAbout,
  toContact,
  submitFeedback,
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
  filterProducts,
  toWallet,
  toReferal
};
