const Users = require("../model/userSchema");
const address = require('../model/address')
const mongoose = require('mongoose')
const products = require("../model/productschema");
const returns = require('../model/returns')
const { ObjectId } = require("mongodb");
const admin = require("../Router/adminRouter");
const category = require("../model/category");
const brands = require("../model/brands");
const orders = require('../model/orders')
const cartModel = require('../model/cart')
const banner = require('../model/banner')
const coupon = require('../model/coupon')
const productOffer = require('../model/productOffer')
const categroryOffer = require('../model/categoryOffer')
const { reset } = require("nodemon");
const sharp = require('sharp')
const fs = require('fs').promises;
const path = require('path');
const { log } = require("console");
const cart = require("../Router/cartRouter");
const Excel = require('exceljs');
const pdf = require('html-pdf')
const categoryOffer = require("../model/categoryOffer");
const cartHelpers = require('../helpers/cartHelpers');
const referal = require("../model/referal");
const Wallet = require("../model/wallet");


// Admin creadentials
const credentials = {
  email: "admin@gmail.com",
  password: "Admin@123",
};

// Admin Login
const loginAdmin = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email === credentials.email && password === credentials.password) {
    console.log("adminlogged");
    req.session.adminlogged = true;
    //Retrieve the User data from the db
    const usersData = await Users.find();
    res.redirect('/admin/dashboard')
  } 
};

const tologin = (req, res) => {
  res.render("./admin/adminlogin", { title: "Login" });
};


// to admin Dashboard
const todashboard =  (req, res) => {
  res.render("./admin/dashboard", { title: "Admin Home"});
};

// get daily sales
const dailySales = async (req, res) => {
  try {
    // Daily sales aggregation pipeline
    const dailySales = await orders.aggregate([
      {
        $match: {
          status: 'Paid' // Assuming you want to consider only 'Paid' orders
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$deliveryDate' } } // Grouping by day
          },
          totalSales: { $sum: '$totalAmount' } // Calculate total sales for each day
        }
      },
      {
        $sort: { _id: 1 } // Sort by day
      }
    ]);

  

    res.status(200).json({ success: true, dailySalesData: dailySales });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: 'An error occurred while fetching daily sales data' });
  }
};


// weekly sales
const weeklySales = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0); // Start of the month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); // End of the month

    const weeklySalesData = await orders.aggregate([
      {
        $match: {
          deliveryDate: { $gte: startOfMonth, $lte: endOfMonth },
          status: 'Paid'
        }
      },
      {
        $group: {
          _id: {
            $floor: {
              $divide: [
                { $subtract: ['$deliveryDate', startOfMonth] }, // Difference in milliseconds
                1000 * 60 * 60 * 24 * 7 // Milliseconds in a week
              ]
            }
          },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } } // Sort by week number
    ]);

    console.log('weekly sales',weeklySalesData)
    res.status(200).json({ success: true, weeklyData: weeklySalesData });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
}




// get Yearly sales
const yearlySales = async (req, res) => {
  try {
    // Get unique years from the deliveryDate in the orders collection
    const uniqueYears = await orders.aggregate([
      {
        $group: {
          _id: { $year: '$deliveryDate' } // Grouping by year from deliveryDate
        }
      },
      {
        $sort: { '_id': 1 } // Sort the data by year
      }
    ]);

    const yearlySalesData = [];

    // For each unique year, calculate total sales
    for (const year of uniqueYears) {
      const yearVal = year._id;

      // Aggregate pipeline to calculate yearly sales for each unique year
      const yearlySalesAggregate = await orders.aggregate([
        {
          $match: {
            deliveryDate: {
              $gte: new Date(`${yearVal}-01-01T00:00:00.000Z`), // Start of the year
              $lte: new Date(`${yearVal}-12-31T23:59:59.999Z`) // End of the year
            },
            status: 'Paid'
          }
        },
        {
          $group: {
            _id: null, // Grouping all results together for the whole year
            totalSales: { $sum: '$totalAmount' }
          }
        }
      ]);

      yearlySalesData.push({
        year: yearVal,
        sales: yearlySalesAggregate.length > 0 ? yearlySalesAggregate[0].totalSales : 0
      });
    }

    // console.log('Yearly sales data:', yearlySalesData);
    res.status(200).json({ success: true,  yearlySalesData });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: 'An error occurred while fetching yearly sales data' });
  }
};



// best selling products
const bestSellingProducts = async (req, res) => {
  try {
    const bestSellingProducts = await orders.aggregate([
      {
        $match: {
          status: 'Paid'
        }
      },
      { 
        $unwind: '$products' // Deconstruct the products array
      },
      {
        $group: {
          _id: '$products.productId', // Group by product ID
          totalQuantity: { $sum: '$products.quantity' }, // Calculate total quantity sold for each product
          totalRevenue: { $sum: '$products.price' }, // Calculate total revenue generated for each product
          count: { $sum: 1 } // Count the number of occurrences of each product
        }
      },
      {
        $sort: { totalQuantity: -1 } // Sort by total quantity sold in descending order
      },
      {
        $limit: 10 // Limit the result to the top 10 best selling products
      },
      {
        $lookup: {
          from: 'products', // Name of the product collection
          localField: '_id', // Field from the orders collection
          foreignField: '_id', // Field from the products collection
          as: 'productInfo' // Alias for the joined product information
        }
      },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          count: 1,
          productName: { $arrayElemAt: ['$productInfo.productName', 0] } // Extract product name from the joined information
        }
      }
    ]);

    // console.log('best selling products are', bestSellingProducts);
    res.status(200).json({ success: true, bestSellingProducts });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: 'An error occurred while fetching best selling products' });
  }
};


// inventory status
const getInventoryStatus = async (req,res)=>{
  try{

    const inventoryStatus = await products.aggregate([
      {
        $match:{
          stock:{$lte:10}  // Matches documents where the stock field is less than or equal to 10
        }
      },
      {
        $lookup:{
          from:'brands',
          localField:'brand',
          foreignField:'_id',
          as:'brandInfo'
        }
      },
      {
        $project:{
          productName:1,
          stock:1,
          brandName : { $arrayElemAt: ['$brandInfo.brandName', 0] } // Extract product name from the joined information
        }
      },
      {
        $sort: { stock: -1 } // Sort by stock in descending order (-1 means descending)
      }
    ])

    // console.log('inventoryproducts are',inventoryStatus)
    res.status(200).json({success:true,inventoryStatus})

  }catch(err){
    console.log(err);
  }
}


// latest orders
const getLatestOrders = async (req,res)=>{
  try {
    
    const latestOrders = await orders.aggregate([
      {
        $unwind:'$products'
      },
      {
        $match: {
          status: { $nin: ['Cancelled'] } // Specify the statuses you want to match
        }
      },
      {
        $lookup:{
          from:'products',
          localField:'products.productId',
          foreignField:'_id',
          as:'productsInfo'
        }
      },
      {
        $lookup:{
          from:'users',
          localField:'userId',
          foreignField:'_id',
          as:'userInfo'
        }
      },
      {
        $sort: {
          deliveryDate: -1 // Sort in descending order based on the 'timestamp' field (replace with your timestamp field name)
        }
      },
      {
        $limit: 10 // Limit to fetch the latest 10 orders
      },
      {
        $project:{
          productsInfo:{
            productName:1
          },
          userInfo:{
            name:1,
            profileImage:1,
            phoneNumber:1
          }
        }
      }
    ]);


    // console.log('latest order',latestOrders)
    res.status(200).json({success:true,latestOrders})
  } catch (error) {
    console.error(error)
  }
}



// admin signout
const signout = async (req, res) => {
  console.log("signout");
  req.session.destroy();
  res.redirect("/admin");
};

/*-----------------------------user management---------------------*/

const UserStatus = async (req, res) => {
  console.log("This is userstatus");
  const id = req.params.id;
  console.log("Receive request " + id);

  const user = await Users.findOne({ _id: id });

  if (!user) {
    return res.status(404).send("User not found");
  }
  const newStatus = !user.status;
  await Users.updateOne({ _id: id }, { $set: { status: newStatus } });

  console.log(
    `User ${user.userName} is ${newStatus ? "unblocked" : "blocked"}`
  );
  res.redirect("/admin/costomers");
};

// to add product page

const toaddProduct = async (req, res) => {
  try {
    const categories = await category.find();
    const Brand = await brands.find();
    const error = req.query.error
    res.render("./admin/addproduct", {
      categories: Array.isArray(categories) ? categories : [],
      Brand,
      error
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Admin adding a product
const addproducts = async (req, res) => {
  try {
    const productname = req.body.productName;
    const existing = await products.findOne({ productName: productname });

    if (existing) {
      return res.redirect(`/admin/add-product?error=this product already exist`)
    }
    const croppedImage = req.body.croppedImage
    console.log('croppedimage',croppedImage)
    const specifications = req.body.specifications;
    const allimages = [];

    // Loop through each file field and push the filename to the array
    for (const key in req.files) {
      allimages.push(req.files[key][0].filename);
    }
    // check the provided images are img format
    const validFormat = ['.jpg','.jpeg','.png','.bmp','.svg']
    let hasInvalidImage = false

    for(const imageName of allimages){
      var isValidImage = validFormat.some(ext=>imageName.toLowerCase().endsWith(ext))
      console.log(`${imageName} is a valid image format: ${isValidImage}`);

      if(!isValidImage){
        hasInvalidImage=true
        break;
      }
    }
    if(hasInvalidImage){
      const err = 'only image files are accepted'
      console.log('false got')
      return res.redirect(`/admin/add-product?error=${encodeURIComponent(err)}`)
    }


    const categoryId = new mongoose.Types.ObjectId(req.body.category);
    const brandId = new mongoose.Types.ObjectId(req.body.brand);
  
    
    // Extract product data from the request
    const productData = {
      category: categoryId,
      productName: req.body.productName,
      price: parseFloat(req.body.price),
      stock:req.body.stock,
      image: allimages,
      description: req.body.description,
      specifications: specifications,
      brand: brandId,
      createdAt:new Date()

      // specification: req.body.specification,
    };

    // Create a new product and save it to the database
    await products.create(productData);
    const productsData = await products.find();
    const categories = await category.find();
    const brand= await brands.find();

    res.redirect(`/admin/products?msg=Product addedd successfully`);
  } catch (err) {
    res.status(500)
    res.redirect(`/admin/products?error=error occured during add product`)
    
  }
};

// function to get the details about product
const getProductById = async (id) => {
  try {
    return await products.findById(id);
  } catch (error) {
    throw error;
  }
};

// To the edit product

const toEditProduct = async (req, res) => {
  try {
    const productId = req.params.productid;
    const product = await getProductById(productId); // Fetch a specific product by ID
    const categories = await category.find();
    const Brand = await brands.find({ brandStatus: true });

    if (!product) {
      const productsData = await products.find();
      const categories = await category.find();
      const brand= await brands.find();
      return res.status(404).render("./admin/products", { err: "Product not found",productsData,categories, brand});
    }

    res.render("./admin/editproduct", {
      priceErr:req.query.priceErr,
      stockErr:req.query.stockErr,
      Products: product,
      Brand,
      categories,
      err: req.query.err
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect(`/admin/products?error=internal server error`)
  }
};

// Edit product post
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { Category, productName, description, brand, specifications } = req.body;
    const existingProduct = await getProductById(productId);

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Price and Stock validation
    const Price = req.body.price;
    const Stock = req.body.stock;
    let redirectURL = `/admin/edit-product/${productId}?`;

    if (Price <= 0) {
      redirectURL += 'priceErr=Please enter a valid price&';
    }

    if (Stock < 0) {
      redirectURL += 'stockErr=Please enter a valid stock&';
    }

    if (redirectURL !== `/admin/edit-product/${productId}?`) {
      return res.status(500).redirect(redirectURL.slice(0, -1)); // Remove the trailing "&"
    }

    const existingImages = existingProduct.image;
    const updatedImages = [];

    // Loop through the existing images to check if a new image is provided
    for (let i = 0; i <= 4; i++) {
      let newImage;

      if (i === 4) {
        newImage = req.files["mainImage"];
      } else {
        newImage = req.files[`newProductImage${i}`];
      }

      const existingImage = existingImages[i];
      const image = newImage ? newImage[0].filename : existingImage;

      updatedImages.push(image);
    }

    // Check if the provided images have valid formats
    const validFormat = ['.jpg', '.jpeg', '.png', '.bmp', '.svg'];
    let hasInvalidImage = false;

    for (const imageName of updatedImages) {
      const isValidImage = validFormat.some(ext => imageName.toLowerCase().endsWith(ext));

      if (!isValidImage) {
        hasInvalidImage = true;
        break;
      }
    }

    if (hasInvalidImage) {
      const err = 'only image files are accepted';
      return res.status(404).json({ success: false, err, hasInvalidImage });
    }

    // Update the product with the new images and other details
    const results = await products.updateOne(
      { _id: productId },
      {
        $set: {
          category: Category,
          productName: productName,
          price: Price,
          stock: Stock,
          image: updatedImages,
          description: description,
          specifications: specifications,
          brand: brand,
        },
      }
    );

    if (results.nModified === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    const errorMessage = error.message || "Error updating product";
    const productsData = await products.find();
    const categories = await category.find();
    const brand = await brands.find();
    return res.status(500).json({ success: false, err: errorMessage, productsData, categories, brand });
  }
};


const deleteProduct = async (req, res) => {
  const id = req.params.productid;

  const product = await getProductById(id);
  console.log('product id is',id)
  console.log('product',product)

  try {

    await products.findByIdAndDelete(id);
    const result = await cartModel.updateMany(
      {}, // Empty filter matches all documents
      {$pull:{products:{productId:new mongoose.Types.ObjectId(id)}}}
      );
      
      if(result && result.modifiedCount > 0){
        console.log('cart item deleted from user carts')
        return res.redirect('/admin/products')
        }
        console.log('Product was not found in any user carts');
        return res.redirect('/admin/products')
  } catch (error) {
    res.redirect("/admin/products")
  }
};



// Customers get
const toCustomers = async (req, res) => {
  try {

    // Pagination
    const page = parseInt(req.query.page) || 1
    const perPage = 10
    const customersCount = await Users.countDocuments()
    const totalPages = Math.ceil(customersCount / perPage)
    const usersData = await Users
    .find()
    .skip((page-1)*perPage)
    .limit(perPage)
    res.render("./admin/customers", { title: "Customers", usersData,totalPages,currentPage:page });
  } catch (e) {
    console.error(e);
    res.status(500).send("An error occurred while fetching user data.");
  }
};

// adminController.js
const blockUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    console.log(userId, "user id");
    // Find the user by ID and update the status to blocked (true)
    const user = await Users.findByIdAndUpdate(userId, { status: false });
    if (user) {
      res.redirect("/admin/customers"); // Redirect to the user list page
    } else {
      res.status(404).send("User not found11");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while blocking the user.");
  }
};

const unblockUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    // Find the user by ID and update the status to active (false)
    const user = await Users.findByIdAndUpdate(userId, { status: true });
    if (user) {
      res.redirect("/admin/customers"); // Redirect to the user list page
    } else {
      res.status(404).send("User not found45");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while unblocking the user.");
  }
};

// Get Category management
const toCategory = async (req, res) => {

  // pagination
  try{
    const page = parseInt(req.query.page)|| 1
    const perPage = 10
    const categoryCount =await category.countDocuments()
    const totalPages = Math.ceil(categoryCount / perPage)
    const categories = await category
    .find()
    .skip((page-1)*perPage)
    .limit(perPage)

    res.render("./admin/categorymgt", {title: "Category",
    categories,
    msg: req.query.msg,
    page,
    totalPages,
    currentPage:page
});
}catch(error){
  console.log(error)
}
};

// to add category
const toaddcategory = (req, res) => {
  res.render("./admin/addcategory", { title: "Add category" });
};






// Add category
const addCategory = async (req, res) => {
  console.log("add category called");

  try {
    if (!req.body.CategoryName || req.body.CategoryName.trim() === "") {
      return res.render("./admin/addcategory", {
        err: "Please provide a valid field",
      });
    }

    const categoryname = req.body.CategoryName.trim(); // Trim spaces from start and end only

    // Regex to check if the category name contains only alphabets
    const lettersOnlyRegex = /^[A-Za-z\s]+$/;

    if (!lettersOnlyRegex.test(categoryname)) {
      return res.render("./admin/addcategory", {
        err: "Category must contain alphabets",
      });
    }

    const existingCategory = await category.findOne({
      CategoryName: categoryname,
    });

    if (existingCategory) {
      console.log(existingCategory);
      return res.render("./admin/addcategory", {
        err: "Category already exists",
      });
    }

    const newCategory = new category({
      CategoryName: categoryname,
      createdAt: new Date(),  
    });

    await newCategory.save();

    console.log("Category added successfully");
    res.redirect("/admin/category");
  } catch (error) {
    console.log(error);
    res.redirect("/admin/category");
  }
};

// Edit category
const toEditCategory = async (req, res) => {
  const categoryid = req.params.categoryId;

  // fetch the category name from the database
  try {
    const Category = await category.findById(categoryid);
    res.render("./admin/editcategory", { title: "Edit Category", Category });
  } catch (error) {
    console.error(error);
    res.status(500);
    res.redirect("/admin/category");
  }
};

// Edit category
const editCategory = async (req, res) => {
  const categoryID = req.params.categoryId;

  try {
   
    const categoryname = req.body.CategoryName;

    // check if the category is already exist
    const existingCategory = await category.find({
      CategoryName: categoryname,
    });
    if (existingCategory && existingCategory.length>0) {
      const Category = await category.find();
      return res.render("./admin/editcategory", {
        err: "category already exist",
        Category,
      });
    }
    // Retrieve the updated category name from the form
    const updatedName = {
      CategoryName: req.body.CategoryName,
    };

    // Find the category by id and update it
    const updatedCategory = await category.findByIdAndUpdate(
      categoryID,
      updatedName,
      { new: true }
    );

    if (updatedCategory) {
      const categories = await category.find();
      console.log("updated");

      res.redirect(`/admin/category?msg=category updated successfully`);
    } else {
      res.render("./admin/editcategory", { err: "Category not found" });
    }
  } catch (e) {
    console.log("error occured");
    res.status(404);
    res.render("./admin/categorymgt", { err: "Error Occured" });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  const categoryID = req.params.categoryId;

  try {
    await category.findByIdAndDelete(categoryID);
    console.log('called and deleted')
    res.redirect(`/admin/category?msg=category deleted successfully`);
  } catch (error) {
    const categories = await category.find();
    console.error(error);
    res.render("./admin/categorymgt", { err: "error occured", categories });
  }
};

const getProductDetails = async () => {
  try {
    return await products.find();
  } catch (error) {
    throw error;
  }
};

// pagination used
const toProducts = async (req, res) => {
  try {
    const msg = req.query.msg
    const page = parseInt(req.query.page) || 1; // Get the requested page from query parameter or default to 1
    const perPage = 10; // Number of products per page

    const productsCount = await products.countDocuments(); // Get total count of products

    const totalPages = Math.ceil(productsCount / perPage); // Calculate total pages

    const productsData = await products
      .find()
      .populate('brand')
      .skip((page - 1) * perPage) // Skip the required number of documents based on page number
      .limit(perPage); // Limit the number of products per page

    const categories = await category.find();
    const brand = await brands.find();

    res.render("./admin/products", {
      title:'Products',
      productsData,
      categories,
      brand,
      error: req.query.error,
      totalPages,
      currentPage:page,
      msg
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteProductImage = async (req,res)=>{
  try {
    const {productId,imageId} = req.params;
    console.log('productId',productId)
    console.log('imageId',imageId)

    // find the product by id
    const product = await products.findById(productId);

    //check if the product exists
    if(!product){
      return res.status(404).json({error:'Product not found'})
    }
    // find the index of the image in the product's images array
    const imageIndex = product.image.findIndex(images => images ===imageId)
    console.log('image index',imageIndex)
    //if the image index is valid, remove the image from the array
    if(imageIndex !== -1){
      product.image.splice(imageIndex,1);
      await product.save()
      return res.status(200).json({message:'image deleted successfully'})
    }else{
      return res.status(404).json({error:'image not found'})
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({error:'Error occured during image deletion'})
  }
}






/*----------------------------brands------------------------*/

// To brands
const tobrands = async (req, res) => {

  try{

    // Pagination
    const page = req.query.page||1
    const perPage = 10
    const brandsCount = await brands.countDocuments()
    const totalPages = Math.ceil(brandsCount / perPage)

    const brand = await brands
    .find()
    .skip((page-1)*perPage)
    .limit(perPage)
    res.render("./admin/brands", { title: "Brands",
     brand,err:req.query.error,
     msg:req.query.msg,
     nullError:req.query.nullbody,
     totalPages,
     currentPage:page
    });
  }catch(error){
    console.log(error)
  }
  
};

// To add brand
const toAddBrand = (req, res) => {
  res.render("./admin/addbrand", { title: "Add Brand" });
};

// Add Brand
const addBrand = async (req, res) => {
  try {
    const brandName = req.body.brandName;
    // const sales = req.body.sales;
    const stock = req.body.stock;

    if (!req.file) {
      res.render("./admin/addbrand", { title: "Add Brand" });
      res.status(400);
    }

    const files = req.file
    const filename = files.filename
    // Filter image files based on their extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp','.svg'];
    const imageFiles = imageExtensions.some(imageName => filename.includes(imageName))

    if(imageFiles==false){
      return res.render('./admin/addbrand',{err:'only image files are accepted'})
    }
      
    const newBrand = new brands({
      brandName: brandName,
      image: req.file.filename,
      addedDate: new Date(),
    });

    await newBrand.save();
    res.redirect("/admin/brands");
    console.log("success");
  } catch (error) {
    console.log(error);
    console.log("failed");
    res.render("./admin/brands", { err: "error occured" });
  }
};




// To edit Brand
const toEditBrand = async (req, res) => {
  const id = req.params.brandId;

  try {
    const brand = await brands.findById(id);
    if (!brand) {
      res.render("./admin/brands", { err: "Brand doesnt exist " });
      res.status(404);
    } else {
      console.log(JSON.stringify(req.query),' -----------------')
      res.render("./admin/editbrand", 
      { title: "Edit Brand",
       brand,
       imageErr:req.query.imgErr ,
       imgError:req.query.imgerror,
       existingErr:req.query.existErr,
       nullError:req.query.nullbody
       });
       console.log("admin entered to editbrand");
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    res.redirect("/admin/brands");
  }
};

// Update Brand
const updateBrand = async (req, res) => {
  const brandId = req.params.brandId;

  try {
    const brand = await brands.findById(brandId);
    if (!brand) {
      return res.status(404).redirect(`/admin/brands?imgerror=brand not found`);
    }
    if(!req.body&& !req.file){
      return res.redirect(`/edit-brand/${brandId}?nullbody=updation will not work until you make some changes`)
    }

    const { brandName } = req.body;
    const existingLogo = await brands.findById(brandId);
    const existingImage = existingLogo.image;

    let updatedBrand = {};

    if (brandName && brandName !== brand.brandName) {
      updatedBrand.brandName = brandName;
    }
    

    if (req.file) {
      const files = req.file;
      const filename = files.filename;

      // Filter image files based on their extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.svg'];
      const imageFiles = imageExtensions.some(imageName => filename.includes(imageName));

      if (!imageFiles) {
        return res.status(400).redirect(`/edit-brand/${brandId}?error=only image files are accepted`);
      }

      if (filename !== existingImage) {
        updatedBrand.image = req.file.filename;
      }
    }

    if (Object.keys(updatedBrand).length > 0) {
      await brands.findByIdAndUpdate(brandId, { $set: updatedBrand });
    }

    res.redirect(`/admin/brands?msg=brand updated successfully`);
  } catch (error) {
    console.error(error);
    res.status(500).redirect(`/admin/brands?error=internal server error`);
  }
};



// Soft deletion of brand
const blockBrand = async (req, res) => {
  const id = req.params.brandId;

  try {
    const brand = await brands.findById(id);

    if (!brand) {
      res.status(404).render("./admin/brands", { err: "Brand not found" });
    }

    // Instead of physically deleting , mark the brand as false
    brand.brandStatus = false;
    await brand.save();
    res.redirect("/admin/brands");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .render("./admin/brands", { err: "Error occured while soft deletion" });
  }
};

// Unblock brand
const unblockBrand = async (req, res) => {
  const id = req.params.brandId;

  try {
    const brand = await brands.findById(id);
    if (!brand) {
      res.status(404).render("./admin/brands", { err: "No Brand found" });
    }

    brand.brandStatus = true;
    await brand.save();

    res.status(200).redirect("/admin/brands");
  } catch (error) {
    console.error(error);
    res.status(500).render("./");
  }
};


// To OrderPage
const toOrders = async(req,res)=>{
   
    const allOrders = await orders.find()
    
    const UserData = await Users.aggregate([
      {
        $lookup:{
          from:'orders',
          localField:'_id',
          foreignField:'userId',
          as:'allOrderedUsers'
        }
      },
      {
        $project:{
          _id:1,
          name:1
        }
      }
    ]).exec()

    const userOrderedImages = await orders.aggregate([
      {
        $lookup:{
          from:'products',
          localField:'orders.products.productId',
          foreignField:'_id',
          as:'allOrdersOfUsers'
        }
      },
      {
        $unwind:'$image'
      }
    ]).exec()
    
    
    res.render('./admin/order',{UserData,allOrders,title:'Orders'})

}


// admin order details view 
const toAdminDetailedOrders = async (req,res)=>{
  const orderId = req.params.orderId

  try{
      const orderFound = await orders.findById(orderId)

      if(!orderFound){
          return res.status(401).json({message:'order not found',success:false})
      }

      const userOrderWithProducts = await orders.aggregate([
          {
              $match: {
                  _id: new mongoose.Types.ObjectId(orderId)
              }
          },
        
          {
              $unwind: '$products'
          },
          {
              $lookup: {
                  from: 'products',
                  localField: 'products.productId',
                  foreignField: '_id',
                  as: 'userOrderedProducts'
              }
          },
          {
              $unwind: '$userOrderedProducts'
          },
          {
              $addFields: {
                  'userOrderedProducts.totalAmount': { $multiply: ['$userOrderedProducts.price', '$products.quantity'] }
              }
          },
          {
              $project: {
                  'userOrderedProducts.productName': 1,
                  'userOrderedProducts.image': 1,
                  'userOrderedProducts.price': 1,
                  'userOrderedProducts.discountedPrice':1,
                  'products.quantity': 1,
                  'userOrderedProducts.totalAmount': 1,
                  'userOrderedProducts.specifications': 1,
                  'userId': 1,
                  'status':1,
                  'address':1,
              }
          },
          {
              $lookup: {
                  from: 'users', // Assuming 'users' is the collection where user information is stored
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userDetails'
              }
          },
          {
              $addFields: {
                  userProfileImage: { $arrayElemAt: ['$userDetails.profileImage', 0] }
              }
          },
          {
              $project: {
                  'userOrderedProducts.productName': 1,
                  'userOrderedProducts.image': 1,
                  'userOrderedProducts.price': 1,
                  'userOrderedProducts.discountedPrice':1,
                  'userOrderedProducts.specifications': 1,
                  'products.quantity': 1,
                  'userOrderedProducts.totalAmount': 1,
                  'userAddress': 1,
                  'userProfileImage': 1,
                  'status':1,
                  'address':1,
                  'userId':1
              }
          }
          
      ]);
      
      const addressId = userOrderWithProducts[0].address
      const userId = userOrderWithProducts[0].userId
      const userAllAddress = await address.findOne({userId:userId})
      
      const addressFound = await userAllAddress.address.find(address => address._id.toString()===addressId.toString())
      console.log('addressfound',addressFound)
      
      res.render('./admin/orderDetails',{orderFound,userOrderWithProducts,addressFound, title:'Order Details'})

  }catch(err){
      console.log(err)
  }
}



// update order status
const updateOrderStatus = async (req,res)=>{
    const {orderId,newStatus} = req.query

    try{

      const updatedOrderStatus = await orders.findOneAndUpdate(
        {_id:orderId},
        {$set:{status:newStatus}},
        {new:true}
      )

      if(!updatedOrderStatus){
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.status(200).json({ message: 'Order status updated successfully', order: updatedOrderStatus });
    
    }catch(err){
      console.error(err)
      return res.status(500).json({message:'internal sever error'})
    }
}

const toRequestedReturns = async (req,res)=>{

  try{

    const requestedRetuns = await orders.aggregate([
      {
        $match:{
          status:'return requested'
        }
      },
      {
        $lookup:{
          from:'users',
          localField:'userId',
          foreignField:'_id',
          as:'userData'
        }
      },
      {
        $lookup:{
          from:'returns',
          localField:'_id',
          foreignField:'orderId',
          as:'returnData'
        }
      },
      {
        $unwind:'$userData'
      },
      {
        $unwind:'$returnData'
      },
      {
        $project:{
          '_id':1,
          'userData.name':1,
          'returnData.reason':1,
          'totalAmount':1
        }
      }
    ])
    res.render('./admin/returns.ejs',{requestedRetuns})
  }catch(err){
    console.log(err)
  }
}

// Approve return request
const approveReturn = async (req,res)=>{
  const orderId = req.params.orderId

  try{

    const updatedOrder = await orders.findOneAndUpdate(
      {_id:orderId},
      {$set:{status:'returned'}},
      {new:true} 
    );

    const deleted = await returns.findOneAndDelete({orderId:orderId})

    const userId = updatedOrder.userId
    const shippingMethod = updatedOrder.shippingMethod
    const totalAmount = updatedOrder.totalAmount

    const returnedAmount = findReturnedAmount(shippingMethod,totalAmount) 

    const userWallet = await Wallet.findOne({userId:userId})

    if(!userWallet){
      const newWallet = new Wallet({
        userId:userId,
        balance:0,
        transactions:[]
      })
    }
    const newTransaction = {
      transactionType: 'credit',
      amount: returnedAmount,
      from: 'order return',
      orderId,
      date: new Date(),
    };

    userWallet.transactions.push(newTransaction)
    userWallet.balance += returnedAmount

    await userWallet.save()

    return res.status(200).json({success:true})

  }catch(err){
    console.log(err)
  }
}

// reject order return
const rejectReturn = async(req,res)=>{
  const orderId = req.params.orderId

  try{

    const updatedOrder = await orders.findByIdAndUpdate(
      orderId,
      {$set:{status:'return  rejected'}},
      {new:true}
    );

    const updatedReturn = await returns.findOneAndDelete({orderId:orderId})

    return res.status(200).json({success:true})
  }catch(err){
    console.error(err)
  }
}


// function to find the returned amount after deducting the shipping charge from grand total
function findReturnedAmount(shippingMethod,totalAmount){
  
  let result ;
  switch(shippingMethod){
    case 'standard' :
      result = totalAmount - 0;
      break;
    
    case 'express' :
      result = totalAmount - 100;
      break;

    case 'sameDay':
      result = totalAmount - 150;
      break;

    default :
      return null
  }

  return result

}

// DOWNLOAD SALES DATA
const downloadSalesReport = async (req,res)=>{

  try{

    const {fileFormat,reportType} = req.query
    console.log('fileformat',fileFormat,reportType)

    let salesData;

    //FETCH SALES DATA BASED ON REPORT TYPE
    switch(reportType){
      case 'daily':
        salesData = await fetchDailySalesData()
        break;

      case 'weekly':
        salesData = await fetchWeeklySalesData()
        break;

      case 'yearly':
        salesData = await fetchYearlySalesData()
        break;

      default:
        return res.status(400).json({success:false,message:'Invalid report type'})
    }

    //GENERATE AND SEND THE SALES REPORT
    generateAndSendSalesReport(res,fileFormat,salesData)

  }catch(err){
    console.error('Error generating sales report', err);
    res.status(500).send('Error generating sales report');
  }
}


const fetchDailySalesData = async () =>{
  
  const currentDate = new Date();
  const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999)

  const dailySalesData = await orders.aggregate([
          {
            $match: {
              deliveryDate: { $gte: startOfDay, $lte: endOfDay },
              status: 'Paid'
            }
          },
          {
            $unwind: '$products'
          },
          {
            $lookup: {
              from: 'products',
              localField: 'products.productId',
              foreignField: '_id',
              as: 'dailyproducts'
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$deliveryDate' } }
              },
              totalSales: { $sum: '$totalAmount' },
              dailyproducts: { $push: '$dailyproducts' }, // Accumulate dailyproducts array for each grouped date
              userId:{$push:'$userId'},
              paymentMode:{$push:'$paymentmode'},
              totalAmount:{$push:'$totalAmount'},
              orderId:{$push:'$_id'}
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project:{
              _id: 1,
              totalSales: 1,
              dailyproducts: 1,
              userId:1,
              paymentMode:1,
              totalAmount:1,
              orderId:1
            }
          }
        ]);
        console.log('daily sales',dailySalesData)

        return dailySalesData
}

// DOWNLOAD WEEKLY SALES
const fetchWeeklySalesData = async()=>{
  try{
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay(), 0, 0, 0, 0);
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6, 23, 59, 59, 999);

    const weeklySalesData = await orders.aggregate([
      {
        $match: {
          deliveryDate: { $gte: startOfWeek, $lte: endOfWeek },
          status: 'Paid'
        }
      },
      {
        $unwind: '$products'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'weeklyproducts'
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$deliveryDate' }, // Grouping by day of the week (Sunday = 1, Monday = 2, ..., Saturday = 7)
          totalSales: { $sum: '$totalAmount' },
          weeklyProducts:{$push:'$weeklyproducts'},
          userId: { $addToSet: '$userId' },
          paymentMode:{$push:'$paymentmode'},
          totalAmount:{$push:'$totalAmount'},
          orderId:{$push:'$_id'}
        }
      },
      { $sort: { '_id': 1 } }, // Sort by day of the week
      {
        $project:{
          _id: 1,
          totalSales: 1,
          weeklyProducts: 1,
          userId:1,
          paymentMode:1,
          totalAmount:1,
          orderId:1
        }
      }
    ]);
    console.log('weekly sales',weeklySalesData)
    const firstWeeklySale = weeklySalesData[0]; // Assuming weeklySales is your array

if (firstWeeklySale && firstWeeklySale.weeklyProducts && firstWeeklySale.weeklyProducts.length > 0) {
  const firstWeeklyProductsArray = firstWeeklySale.weeklyProducts[0]; // Accessing the first element of weeklyProducts array

  for (const item of firstWeeklyProductsArray) {
    // Now 'item' represents each item inside the inner array
    console.log('this is the item which is you are searching',item);
  }
} else {
  console.error('Invalid weekly sales data or empty weeklyProducts array.');
}
    return weeklySalesData
  }catch(err){
    console.error(err)
    throw err;
  }
}



// download yearly sales
const fetchYearlySalesData = async () => {
  try {
       // Get unique years from the deliveryDate in the orders collection
       const uniqueYears = await orders.aggregate([
        {
          $group: {
            _id: { $year: '$deliveryDate' } // Grouping by year from deliveryDate
          }
        },
        {
          $sort: { '_id': 1 } // Sort the data by year
        }
      ]);
  
      const yearlySalesData = [];
  
      // For each unique year, calculate total sales
      for (const year of uniqueYears) {
        const yearVal = year._id;
  
        // Aggregate pipeline to calculate yearly sales for each unique year
        const yearlySalesAggregate = await orders.aggregate([
          {
            $match: {
              deliveryDate: {
                $gte: new Date(`${yearVal}-01-01T00:00:00.000Z`), // Start of the year
                $lte: new Date(`${yearVal}-12-31T23:59:59.999Z`) // End of the year
              },
              status: 'Paid'
            }
          },
          {
            $group: {
              _id: null, // Grouping all results together for the whole year
              totalSales: { $sum: '$totalAmount' }
            }
          }
        ]);
  
        yearlySalesData.push({
          year: yearVal,
          sales: yearlySalesAggregate.length > 0 ? yearlySalesAggregate[0].totalSales : 0
        });
      }

  } catch (err) {
    console.error('Error generating yearly sales report', err);
    res.status(500).send('Error generating yearly sales report');
  }
};


const generateAndSendSalesReport = async (res, fileFormat, salesData) => {
  try {
    // Set common headers based on file format
    let contentType, contentDisposition, extension;

    if (fileFormat === 'excel') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      contentDisposition = 'attachment; filename="sales-report.xlsx"';
      extension = 'xlsx';
    } else if (fileFormat === 'pdf') {
      contentType = 'application/pdf';
      contentDisposition = 'attachment; filename="sales-report.pdf"';
      extension = 'pdf';
    } else {
      // Invalid file format
      res.status(400).json({ success: false, message: 'Invalid file format' });
      return;
    }

    // Set headers for Excel or PDF file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);

    // Generate content based on the file format
    let content;

    if (fileFormat === 'excel') {
      // Generate Excel report
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      // Add headers
      worksheet.addRow(['OrderID', 'Product Name', 'Total Amount', 'Payment Method']);

     // Add data to the worksheet
salesData.forEach(daySale => {
  if (daySale.weeklyProducts && daySale.weeklyProducts.length > 0) {
    daySale.weeklyProducts.forEach((productArray, index) => {
      const product = productArray[0];
      if (product) {
        worksheet.addRow([daySale.orderId[index], product.productName, daySale.totalAmount[index], daySale.paymentmode[index]]);
      }
    });
  }
});


      // Write the workbook data to the response
      content = await workbook.xlsx.writeBuffer();
    } else if (fileFormat === 'pdf') {
      // Generate HTML content for PDF
      const htmlContent = generateHtmlForSalesReport(salesData);

      // Options for html-pdf
      const pdfOptions = { format: 'Letter' };

      // Generate PDF from HTML content
      content = await new Promise((resolve, reject) => {
        pdf.create(htmlContent, pdfOptions).toBuffer((err, buffer) => {
          if (err) {
            console.error('Error generating PDF', err);
            reject('Error generating PDF');
          } else {
            resolve(buffer);
          }
        });
      });
    }

    // Send the generated content as the response
    res.end(content);

  } catch (err) {
    console.error('Error generating sales report', err);
    res.status(500).send('Error generating sales report');
  }
};




// Function to generate HTML content for PDF
const generateHtmlForSalesReport = (salesData) => {
  // Modify this part based on your HTML structure
  let htmlContent = '<html><head><title>Daily Sales Report</title></head><body>';
  htmlContent += '<h1>Daily Sales Report</h1>';

  salesData.forEach(daySale => {
    htmlContent += `<h2>Week: ${daySale._id}</h2>`;
    htmlContent += '<table border="1"><tr><th>Product Name</th><th>User ID</th><th>Payment Mode</th><th>Total Amount</th><th>Order ID</th></tr>';

    daySale.weeklyProducts.forEach((productArray, index) => {
      const product = productArray[0]; // Assuming dailyproducts is an array of arrays

      htmlContent += `<tr>`;
      htmlContent += `<td>${product.productName}</td>`;
      htmlContent += `<td>${daySale.userId[0]}</td>`;
      htmlContent += `<td>${daySale.paymentMode[index]}</td>`;
      htmlContent += `<td>${daySale.totalAmount[index]}</td>`;
      htmlContent += `<td>${daySale.orderId[index]}</td>`;
      htmlContent += `</tr>`;
    });

    htmlContent += '</table><br>';
  });

  htmlContent += '</body></html>';
  return htmlContent;
};


// coupon 
const toCoupons =async (req,res)=>{

  const allCoupons = await coupon.find()
  res.render('./admin/coupon.ejs',{allCoupons})
}

// Add coupon
const createCoupon = async (req,res)=>{

  try {
    const {couponName,code,minimumAmount,discountAmount,startDate,endDate,maxUsage} = req.body

    const couponExist = await coupon.findOne({couponName:couponName})

    if(couponExist){
      res.status(400).json({success:false,message:'This coupon is already exist'})
    }

    const newCoupon = new coupon({
      couponName,
      code,
      minimumAmount,
      discountAmount,
      startDate,
      endDate,
      maxUsage
    })


     // Save the new coupon to the database
    await newCoupon.save()

    res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create coupon', error: error.message });
    console.error(error)
  }
}

// get the specific coupon with the id 
const getSingleCoupon = async (req,res)=>{
  const couponId = req.params.couponId

  try {

    const singleCoupon = await coupon.findOne({_id:couponId})
    console.log(singleCoupon)
    res.status(200).json({success:true,singleCoupon})

  } catch (error) {
    console.error(error)
    res.status(500).json({message:'internal server error'})
  }
}

// edit Coupon 
const editCoupon = async (req, res) => {
  const { couponId, couponName, code, minimumAmount, discountAmount, startDate, endDate, maxUsage } = req.body;

  try {
      // Check if the coupon exists
      const existingCoupon = await coupon.findById(couponId);
      
      if (!existingCoupon) {
          console.log('coupon not found')
          return res.status(404).json({ message: 'Coupon not found' });
      }

      // startDate and endDate are properties in req.body
      const startDateFromBody = req.body.startDate;
      const endDateFromBody = req.body.endDate;

      // Update the coupon details
      existingCoupon.couponName = couponName;
      existingCoupon.code = code;
      existingCoupon.minimumAmount = minimumAmount;
      existingCoupon.discountAmount = discountAmount;
      existingCoupon.startDate = startDateFromBody ? startDateFromBody :existingCoupon.startDate ;
      existingCoupon.endDate = endDateFromBody ? endDateFromBody :existingCoupon.endDate  ;
      existingCoupon.maxUsage = maxUsage;

      // Save the updated coupon
      await existingCoupon.save();
      console.log('edited')

      return res.status(200).json({ message: 'Coupon updated successfully' });
  } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete the coupon
const deleteCoupon = async (req, res) => {
  const couponId = req.params.couponId; 

  try {
      // Find the coupon by ID and delete it
      const deletedCoupon = await coupon.findByIdAndDelete(couponId);

      if (!deletedCoupon) {
          return res.status(404).json({ message: 'Coupon not found' });
      }

      // Return a success message
      return res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
      // Handle errors
      console.error('Error deleting coupon:', error);
      return res.status(500).json({ message: 'Failed to delete coupon' });
  }
};


// to product offer
const toProductOffer = async (req,res)=>{
    try{

      const allProducts = await products.find()
      const allProductOffers = await productOffer.find()
      res.render('./admin/productOffer.ejs',{allProducts,allProductOffers})

    }catch(err){
      console.log(err)
    }
}


// Add product Offer
const createProductOffer = async (req, res) => {
  console.log('createProductOffer called');

  const { productId, productName, OfferPercentage, startDate, endDate } = req.body;

  try {
      // Ensure all required fields are present in the request body
      if (!productId || !productName || !OfferPercentage || !startDate || !endDate) {
          return res.status(400).json({ message: 'Please provide all necessary fields' });
      }

      if (endDate < startDate) {
        return res.status(400).json({ message: 'End date should be later than the start date' });
      }
      // You may want to check if productId is valid or exists in the database here
      const productFound = await products.findOne({_id:productId})

      if(!productFound){
        return res.status(404).json({success:false,message:'The product not found in the database'})
      }
      const newProductOffer = new productOffer({
          productId: productId,
          productName: productName, 
          OfferPercentage: OfferPercentage,
          addedDate: startDate,
          endDate: endDate,
      });

      await newProductOffer.save();

      const discountedAmount = await cartHelpers.calculateDiscountedPrice(productFound.price,OfferPercentage)
      console.log('discountedAmount',discountedAmount)

      if(discountedAmount){
      productFound.discountedPrice = productFound.price - discountedAmount
      productFound.offerType = 'productOffer'
      await productFound.save()
    }
    console.log('product offer updated')

      res.status(201).json({ message: 'Product offer created successfully', productOffer: newProductOffer });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create product offer', error: err.message });
  }
};


// Get single productOfer for editing purpose
const getSingleProductOffer = async (req,res)=>{
  const productOfferId = req.params.offerId

  try{
    const singleProductOffer = await productOffer.findOne({_id:productOfferId})
    if(!singleProductOffer){
      return res.status(404).json({message:'product offer not found'})
    }
    res.status(200).json({success:true,singleProductOffer})
  }catch(err){
    console.log(err)
  }
}


// edit the product offer
const editproductOffer = async (req,res)=>{
  console.log(req.body)
  const {productOfferId,productId,productName,OfferPercentage,startDate,endDate} = req.body


  try{

    // Check if the coupon exists
    const existingOffer = await productOffer.findById(productOfferId)

    if(!existingOffer){
      console.log('productoffer not found')
      return res.status(404).json({message:'No offer found for this product'})
    }

    // startDate and endDate are properties in req.body
    const startDateFromBody = startDate;
    const endDateFromBody = endDate;

    existingOffer.productId = productId;
    existingOffer.productName = productName;
    existingOffer.OfferPercentage = OfferPercentage;
    existingOffer.addedDate = startDateFromBody ? startDateFromBody : existingOffer.addedDate;
    existingOffer.endDate = endDateFromBody ? endDateFromBody : existingOffer.endDate;

    //save the updated product offer
    await existingOffer.save()
    console.log('offer edited')

    const productFound = await products.findById(productId)
    if(productFound){

      const discountedAmount = await cartHelpers.calculateDiscountedPrice(productFound.price,OfferPercentage)
      productFound.discountedPrice = productFound.price - discountedAmount
      console.log('discounted amount in products',discountedAmount)
    }
    productFound.save()

    return res.status(200).json({message:'Product offer Updated'})
  }catch(err){
    console.log(err)
    return res.status(500).json({message:'Internal server error'})
  }

}

// remove the product offer 
const deleteProductOffer = async (req,res)=>{
  
  const productOfferId = req.params.offerId

  try {
    
    const productOfferFound = await productOffer.findById(productOfferId)

    const productId = productOfferFound.productId
    console.log('prductid in delte productoffer',productId)

    if(!productOfferFound){
      return res.status(404).json({message:'Product offer not found'})
    }

    const deleted = await productOffer.findByIdAndDelete(productOfferId)

    const updatedProducts = await products.updateOne(
      {_id:productId,offerType:'productOffer'},
      {$set:{discountedPrice:0,offerType:null}}
    )

    if(updatedProducts){
      console.log('updated success')
      return res.status(200).json({success:true})
    }
  } catch (error) {
    console.log(error)
  }
}


// Admin logout
const toLogout = (req, res) => {
  req.session.adminlogged = false;
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      res.send("error");
    } else {
      res.redirect("/admin");
    }
  });
};

// to Category Offer
const toCategoryOffer = async (req,res)=>{

  try{

    const allCategories = await category.find()
    const allCategryOffers = await categoryOffer.find()
  
    res.render('./admin/categoryOffer.ejs',{allCategories,allCategryOffers})
  }catch(err){
    console.log(err)
  }
}

// Add category offer
const addCategoryOffer = async (req,res)=>{

  try{
    const {categoryId,CategoryName,OfferPercentage,startDate,endDate} = req.body

    if(!categoryId || !CategoryName || !OfferPercentage || !startDate || !endDate){
      return res.status(400).json({message:'Please provide all necessary field'})
    }

    if (endDate < startDate) {
      return res.status(400).json({ message: 'End date should be later than the start date' });
    }

    // check the category is exist in the database 
    const categoryFound = await category.findById(categoryId)
    
    if(!categoryFound){
      return res.status(404).json({message:'categrory not found'})
    }

    
    
    // else the data is valid and exist in the database
    const newCategoryOffer = new categoryOffer({
      categoryId:categoryId,
      categoryName:CategoryName,
      OfferPercentage:OfferPercentage,
      addedDate:startDate,
      endDate:endDate
    });
    await newCategoryOffer.save()
    
    const withoutProductOffer = await products.find(
      { 
        category: categoryId, // Your query criteria
        offerType: { $ne: 'productOffer' } // The condition for offerType not equal to 'productOffer'
      }
    );
    
    const productIds = withoutProductOffer.map(product => product._id )


    // Update offerType in products collection to 'categoryOffer'
    const updateProducts = await products.updateMany(
      { _id: { $in: productIds } }, // Filter criteria: Not in productIds array
      { $set: { offerType: 'categoryOffer' } } 
    );
    

    // Calculate the multiplier for the discount percentage
    const discountMultiplier = 1 - (OfferPercentage / 100);
    console.log('discount multiplier',discountMultiplier)

    // Fetch products under the specified category
    const productsToUpdate = await products.find({ category: categoryId });
    console.log('productstoupdate',productsToUpdate)

     // Update discountedPrice for each product
     for (const product of productsToUpdate) {
      // Calculate the discounted price based on the discount percentage
      const discountedPrice = product.price * discountMultiplier;
  

      // Update the product's discountedPrice field
      await products.findByIdAndUpdate(product._id, { discountedPrice: discountedPrice });
  
    }
    
    return res.status(200).json({message:'category offer added successfully',categroryOffers:newCategoryOffer})
  }catch(err){
    console.log(err)
    return res.status(500).json({ message: 'Failed to create category offer', Error: err.message });
  }
}

// Get Single category offer
const getSingleCategoryOffer = async (req,res)=>{
  const categroyOfferId = req.params.offerId
  console.log('categoryofferid',categroyOfferId)
  try{
    const categoryOfferFound = await categoryOffer.findById(categroyOfferId)

    if(!categoryOfferFound){
      return res.status(404).json({message:'No Category Offer Found'})
    }
    return res.status(200).json({success:true,categoryOfferFound})
  }catch(err){
    console.log(err)
  }
}


// Edit category Offer
const editCategoryOffer = async (req,res)=>{
  const {categoryOfferID,categoryId,categoryName,OfferPercentage,startDate,endDate} = req.body

  try{

    // Check if the offer exists
    const existingOffer = await categoryOffer.findById(categoryOfferID)

    if(!existingOffer){
      console.log('category offer not found')
      return res.status(404).json({message:'No offer found for this category'})
    }

    // startDate and endDate are properties in req.body
    const startDateFromBody = startDate;
    const endDateFromBody = endDate;

    existingOffer.categoryId = categoryId;
    existingOffer.categoryName = categoryName;
    existingOffer.OfferPercentage = OfferPercentage;
    existingOffer.addedDate = startDateFromBody ? startDateFromBody : existingOffer.addedDate;
    existingOffer.endDate = endDateFromBody ? endDateFromBody : existingOffer.endDate;

    //save the updated category offer
    await existingOffer.save()
    
    const discountMultiplier = 1 - (OfferPercentage / 100 );
    console.log('discount multiplier',discountMultiplier)

    // Fetch products under the specified category
    const productstoupdate = await products.find({category:categoryId})

    // update the discounted Price for each product
    for(const product of productstoupdate){
      // calculate the discounted price based on the discounted percentage
      const discountedPrice = product.price * discountMultiplier

      // update the product's discounted price field
      await products.findByIdAndUpdate(product._id,{discountedPrice:discountedPrice})
    }
    console.log('edited successfully')

    return res.status(200).json({message:'Product offer Updated'})

  }catch(err){
    console.log(err)
    return res.status(500).json({message:'Internal server error'})
  }
}

// remove the category offer 
const deleteCategoryOffer = async (req,res)=>{
 
  const categoryOfferId = req.params.offerId

  try {
    
    const categoryOfferFound = await categoryOffer.findById(categoryOfferId)
    if (!categoryOfferFound) {
      return res.status(404).json({ message: 'Category offer not found' });
    }

    const categoryId= categoryOfferFound.categoryId;

    // Remove the category offer
    await categoryOffer.findByIdAndDelete(categoryOfferId);

    // RESET PRODUCT DETAILS IF THE OFFER WAS ASSOCIATED WITH PRODUCTS
    const updatedProducts = await products.updateMany(
      {category:categoryId, offerType:'categoryOffer'}, //  FILTER
      {$set:{offerType:null,discountedPrice:0}}
    );
    console.log('deleted new category offer')
    return res.status(200).json({ message: 'Category offer deleted successfully' });

  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Failed to delete category offer', error: err.message });
  }
}


// to Referal management
const toReferal = async (req,res)=>{

  try{
    const allReferalData = await referal.aggregate([
      {
        $unwind:'$joinedUser'
      },
      {
        $lookup:{
          from:'users',
          localField:'joinedUser.userId',
          foreignField:'_id',
          as:'referedUserInfo'
        }
      },
      {
        $unwind:'$invitedUser'
      },
      {
        $lookup:{
          from:'users',
          localField:'invitedUser.userId',
          foreignField:'_id',
          as:'invitedUserInfo'
        }
      },
      {
        $project:{
          'referedUserInfo':1,
          'invitedUserInfo':1
        }
      }
    ])


    return res.render('./admin/referal.ejs',{allReferalData})

  }catch(err){
    console.error(err)
  }
}


// Add referal offer
const addReferalOffer = async (req,res)=>{

  try {
    const { offerAmount, validFrom, validUntil } = req.body;
  

    
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);
    if (fromDate >untilDate) {
      return res.status(400).json({ message: 'Valid until date must be after valid from date' });
    }

    
    const newReferalOffer = new referal({
      offerAmount: offerAmount,
      validFrom: fromDate,
      validUntil: untilDate,
      status: true,
      joinedUser: [],
      invitedUser: []
    });

    await newReferalOffer.save();

    return res.status(200).json({ message: 'Referral offer added successfully', referralOffer: newReferalOffer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to add referral offer', error: err.message });
  }
}

// delete referal
const deleteReferal = async (req, res) => {
  const referalId = req.params.referalId;
  
  try {
    const deletedReferal = await referal.findByIdAndDelete(referalId);
    
    if (!deletedReferal) {
      return res.status(404).json({ message: 'Referal not found' });
    }

    return res.status(200).json({ message: 'Referal deleted successfully' });
  } catch (error) {
    console.error('Error deleting referal:', error);
    return res.status(500).json({ message: 'Failed to delete referal', error: error.message });
  }
};


// To banner management
const toBannerManagement = async(req,res)=>{

  try{
    const allBanners = await banner.find()
    res.render('./admin/bannerMgt.ejs',{allBanners})
  }catch(err){
    console.log(err)
  }
}

// Upload the banner
const uploadBanner = async (req,res)=>{
  try{
  
    if(!req.file){
      return res.status(400).json({success:false,message:'image not found'})
    }
    const bannerImage = req.file
    const splitted = bannerImage.filename.split('.')
    const imageType = splitted[1]

    const validImageTypes = ['png','jpg','jpeg']
    const validImage = validImageTypes.includes(imageType)

    if(!validImage){
      console.log('invalid image')
      return res.status(400).json({invalidImage:true,message:'invalid image format'})
    }

    const resizedImageBuffer = await sharp(bannerImage.path)
  .resize({ width: 800, height: 300 })
  .toBuffer();

  // SAVE THE DESIRED IMAGE
  const newFileName = `${bannerImage.filename}`;
  const imagePath = `./public/uploads/banner-images/${newFileName}`;
  await sharp(resizedImageBuffer).toFile(imagePath, { quality: 100 });


    const newBanner = new banner({
      image:bannerImage.filename,
      date:new Date()
    })
    await newBanner.save()
   

    return res.status(200).json({success:true,message:'Banner Added succesfully'})

  }catch(err){
    console.error(err)
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// CHANGE THE BANNER
const changeBanner = async (req,res)=>{
  const bannerId = req.params.bannerId
 
  try{
    const exisitingBanner = await banner.findById(bannerId)
    console.log(exisitingBanner)
    
    if(!exisitingBanner){
      return res.status(400).json({message:'banner not found'})
    }

    if(!req.file){
      return res.status(400).json({success:false,message:'image not found'})
    }
    const bannerImage = req.file
    const splitted = bannerImage.filename.split('.')
    const imageType = splitted[1]

    const validImageTypes = ['png','jpg','jpeg']
    const validImage = validImageTypes.includes(imageType)

    if(!validImage){
      console.log('invalid image')
      return res.status(400).json({invalidImage:true,message:'invalid image format'})
    }

    // RESIZE THE IMAGE TO THE DESIRED DIMENSIONS
    const resizedImageBuffer = await sharp(bannerImage.path)
    .resize({widht:800,height:200})
    .toBuffer()   

    // SAVE THE DESIRED IMAGE
    const newFileName = `${bannerImage.filename}`;
    const imagePath = `./public/uploads/banner-images/${newFileName}`
    await sharp(resizedImageBuffer).toFile(imagePath,{quality:100})

    exisitingBanner.image = req.file.filename
    exisitingBanner.date = new Date()

    await exisitingBanner.save()
    console.log('banner updated')

  }catch(err){
    console.error(err)
  }
}


// DELETE THE BANNER
const deleteBanner = async (req,res)=>{
  const bannerId = req.params.bannerId

  try{

    const bannerDeleted = await banner.findByIdAndDelete(bannerId)
    
    if(!bannerDeleted){
      return res.status(400).json({message:'banner not found'})
    }
    
    return res.status(200).json({success:true,message:'banner deleted successfully'})
  }catch(err){
    console.error(err)
  }
}


module.exports = {
  loginAdmin,
  tologin,
  todashboard,
  dailySales,
  weeklySales,
  yearlySales,
  bestSellingProducts,
  getInventoryStatus,
  getLatestOrders,
  signout,
  UserStatus,
  toaddProduct,
  addproducts,
  toCustomers,
  blockUser,
  unblockUser,
  toCategory,
  toProducts,
  toLogout,
  addCategory,
  toaddcategory,
  toEditCategory,
  editCategory,
  deleteCategory,
  toEditProduct,
  updateProduct,
  deleteProduct,
  tobrands,
  toAddBrand,
  addBrand,
  toEditBrand,
  updateBrand,
  blockBrand,
  unblockBrand,
  toOrders,
  toAdminDetailedOrders,
  updateOrderStatus,
  deleteProductImage,
  toCoupons,
  createCoupon,
  getSingleCoupon,
  editCoupon,
  deleteCoupon,
  toProductOffer,
  createProductOffer,
  getSingleProductOffer,
  deleteProductOffer,
  editproductOffer,
  toCategoryOffer,
  addCategoryOffer,
  getSingleCategoryOffer,
  editCategoryOffer,
  deleteCategoryOffer,
  toReferal,
  addReferalOffer,
  deleteReferal,
  toBannerManagement,
  uploadBanner,
  changeBanner,
  deleteBanner,
  downloadSalesReport,
  toRequestedReturns,
  approveReturn,
  rejectReturn
  
};
