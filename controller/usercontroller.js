const User = require("../model/userSchema");
const products = require("../model/productschema");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const router = require("../Router/userRouter");
const { transporter, sendOtp, generateOTP } = require("./otpcontroller");
const brands = require("../model/brands");
const category = require("../model/category");

require("dotenv").config();

// To userHome
const toHome = async (req, res) => {
  try {
    // Retrueve products from the database
    const data = await products.find();

    res.render("./user/guesthome", { title: "Home", data });
  } catch (err) {
    // Handle errors
    res.status(500).send("an error occured");
  }
};

//User signup
const userSignup = async (req, res) => {
  console.log("user signup");

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.render(".user/usersignup", { msg: "Fill out the fields" });
    }
    const check = await User.findOne({ email: req.body.email });

    console.log(typeof check);
    if (check === null) {
      const pass = await bcrypt.hash(req.body.password, 10);

      // Generate OTP
      const otp = generateOTP();

      const mailOptions = {
        from: "jidhuyasim@gmail.com",
        to: req.body.email,
        subject: "Your OTP for signup",
        text: `your OTP is ${otp}`,
      };

      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          res.render("./user/usersignup", {
            msg: "Failed to send otp via email",
          });
        } else {
          // Store the user's email and OTP in the session for verification

          req.session.email = req.body.email;
          req.session.pass = pass;
          req.session.name = req.body.name;
          req.session.otp = otp;
          res.redirect("/verify-otp");
        }
      });
    } else {
      req.session.err = "User already exists";
      res.render("./user/usersignup", { msg: "User Already exist" });
      console.log("User already exists");
    }
  } catch (e) {
    console.log(e);
    req.session.err = "something went wrong";
    res.render("./user/usersignup");
    console.log("user already exist");
  }
};

const toverifyotp = (req, res) => {
  res.render("./user/verifyotp");
};

const verifyOtp = async (req, res) => {
  try {
    const otp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
    console.log("Received OTP:", otp);
    console.log("Stored OTP:", req.session.otp);

    const pass = req.session.pass;

    if (otp === req.session.otp) {
      // OTP is correct, proceed to save the user
      console.log("OTP is correct, proceeding to save user");

      const newUser = new User({
        email: req.session.email,
        password: pass,
        name: req.session.name,
      });
      console.log("passs is ", pass);

      await newUser.save();
      console.log("User saved successfully");

      const flashsales = await category.findOne({
        CategoryName: "Flash Sales",
      });
      const premiumCategory = await category.findOne({
        CategoryName: "Premium",
      });

      if (premiumCategory || flashsales) {
        // Fetch products that belong to the "Premium" category using the category "_id"
        const premiumProducts = await products.find({
          category: premiumCategory._id,
        });
        const flashsalesProducts = await products.find({
          category: flashsales.id,
        });
        const categorywise = await products.find();
        console.log("<<<<<<<<<<<<<<<", categorywise);

        const brand = await brands.find();

        res.render("./user/userhome", {
          title: "Home",
          err: false,
          data: premiumProducts,
          brand,
          Category: premiumCategory,
          flashSales: flashsalesProducts,
        });
      } else {
        // Handle if Premium category is not found
        res.status(404).send("Premium category not found");
      }
    } else {
      console.log("Invalid OTP");
      res.render("./user/verifyotp", { msg: "Invalid OTP" });
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

    return res
      .status(200)
      .render("./user/verifyotp", {
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
    console.log("body", req.body, check);
    if (check !== null) {
      const isMatch = await bcrypt.compare(req.body.password, check.password);
      console.log(isMatch, " is match");
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
      return res.json({ success: false, err: "User not found" });
    }
  } catch (error) {
    return res.json({ success: false, err: "invalid username or password" });
  }
};

const userlog = async (req, res) => {
  try {
    if (req.session.userlogged || req.user) {
      const user = req.session.userlogged;

      // Fetch the IDs of blocked brands
      const blockedBrands = await brands.find(
        { brandStatus: true },
        { _id: 1 }
      );

      // Extract the IDs of blocked brands
      const blockedBrandIds = blockedBrands.map((brand) => brand._id);

      // Find the "_id" of the premium category
      const flashsales = await category.findOne({
        CategoryName: "Flash Sales",
      });
      console.log(flashsales);
      // Find the "_id" of the "Premium" category
      const premiumCategory = await category.findOne({
        CategoryName: "Premium",
      });

      if (premiumCategory || flashsales) {
        // Fetch products that belong to the "Premium" category using the category "_id"
        const premiumProducts = await products.find({
          category: premiumCategory._id,
        });
        const flashsalesProducts = await products.find({
          category: flashsales.id,
        });
        const categorywise = await products.find();

        const brand = await brands.find();

        res.render("./user/userhome", {
          title: "Home",
          err: false,
          data: premiumProducts,
          brand,
          Category: premiumCategory,
          flashSales: flashsalesProducts,
        });
      } else {
        // Handle if Premium category is not found
        res.status(404).send("Premium category not found");
      }
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin/tosignup");
  }
};

// Signup to Login
const signupToLogin = (req, res, next) => {
  res.render("./user/userlogin", { title: "login", err: false });
};

// To Signup page
const toSignup = (req, res, next) => {
  if (req.session.userlogged) {
    res.redirect("/user/home");
  } else {
    res.render("./user/usersignup", { title: "Signup", err: false });
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
    console.log(productId);

    const data = await products.find({ _id: productId });

    if (!data) {
      return res.status(404).send("product not found");
    } else {
      console.log("product view reached");
      res.render("./user/productdetails", { data });
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
    let data = await products.find();
    res.render("./user/productlist", { title: "Products", data });
  } catch (e) {
    console.log(e);
    res.status(500).send("internet server error");
  }
};

// To brandwise productions
const toBrandwise = async (req, res) => {
  const brandid = req.params.brandId;

  const brandProducts = await products.find({ brand: brandid });
  const Brand = await brands.find();
  console.log("brandproducts iam ", brandProducts);
  res.render("./user/brandwise", { brandProducts, Brand });
};
async function filterByBrand(req, res) {
  const brandName = req.query.brand;
  console.log(brandName);
  const filteredData = await products.find({ brand: brandName });

  res.json({ brand: filteredData });
}

const toViewAll = async (req, res) => {
  const categoryId = req.params.categoryId;
  console.log(".......................", categoryId);

  try {
    const productData = await products.find({ category: categoryId });
    console.log("Category:", productData);

    if (productData) {
      res.render("./user/viewall", { productData });
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


// To cart
const toCart = (req,res)=>{{
    res.render('./user/cart')
}}

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
  toCart
};
