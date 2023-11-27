const Users = require("../model/userSchema");
const products = require("../model/productschema");
const { ObjectId } = require("mongodb");
const admin = require("../Router/adminRouter");
const category = require("../model/category");
const brands = require("../model/brands");
const { reset } = require("nodemon");
const fs = require('fs');
const path = require('path');

// Admin creadentials
const credentials = {
  email: "admin@gmail.com",
  password: "123",
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
    res.render("./admin/dashboard", { title: "Admin Home", err: false });
  } else if (!email || !password) {
    res.render("./admin/adminlogin", { err: "fill out this fields" });
  } else {
    console.log("admin login failed");
    res.render("./admin/adminlogin", { err: "Invalid email or password" });
  }
};

const tologin = (req, res) => {
  res.render("./admin/adminlogin", { title: "Login" });
};

const todashboard = (req, res) => {
  res.render("./admin/dashboard", { title: "Admin Home" });
};

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
    res.render("./admin/addproduct", {
      categories: Array.isArray(categories) ? categories : [],
      Brand,
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
    const existing = await products.findOne({ productname });

    if (existing) {
      const categories = await category.find();
      return res.render("./admin/addproduct", {
        err: "This product already exists",
        categories,
      });
    }
    const Price = req.body.price 
    if(Price <=0 ){
      const categories = await category.find();
      const Brand = await brands.find()
      return res.render("./admin/addproduct", {
        priceErr: "please enter a valid price",
        categories,
        Brand
      });
    }
    const Stock = req.body.stock
    if(Stock<=0){
      const categories = await category.find()
      const Brand = await brands.find()
      return res.render('./admin/addproduct',{stockErr:'please enter a valid stock',categories,Brand})
    }

    const specifications = req.body.specifications;
    const allimages = [];

    // Loop through each file field and push the filename to the array
    for (const key in req.files) {
      allimages.push(req.files[key][0].filename);
    }
    

    // Extract product data from the request
    const productData = {
      category: req.body.category,
      productName: req.body.productName,
      price: parseFloat(req.body.price),
      stock:req.body.stock,
      image: allimages,
      description: req.body.description,
      specifications: specifications,
      brand: req.body.brand,

      // specification: req.body.specification,
    };

    // Create a new product and save it to the database
    await products.create(productData);
    const productsData = await products.find();
    const categories = await category.find();
    const brand= await brands.find();

    res.render("./admin/products", { productsData, categories, brand });
  } catch (err) {
    // Handle errors
    console.log(err)
    const productsData = await products.find();
    const categories = await category.find();
    const brand= await brands.find();
    // const categories = await category.find();
    res.render("./admin/products", {
      title: "Products",
      err: "Error Occurred",
      productsData:productsData,
      categories,
      brand
    });
    
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
      return res
        .status(404)
        .render("./admin/products", { err: "Product not found",productsData,categories, brand});
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
      const productsData = await products.find();
      const categories = await category.find();
      const brand= await brands.find();
    res
      .status(500)
      .render("./admin/products", { err: "Internal server error",productsData,categories,brand });
  }
};

// Edit product post
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { Category, productName,description, brand, specifications } = req.body;

    const existingProduct = await getProductById(productId);

    if (!existingProduct) {
      return res.status(404).send("Product not found");
    }
    //product validation
    const existingProductName = await products.findOne({ productName });
    if (existingProductName && existingProductName._id.toString() !== productId) {
      const categories = await category.find();
      const Brand = await brands.find();
      const productsData = await products.find();
      const existingProduct = await getProductById(productId);
      return res.render("./admin/editproduct", {
        err: "This product name already exists",
        categories,
        Brand,
        Products:productsData,

      });
    }

    // price validation
    const Price = req.body.price
    const Stock = req.body.stock
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
    if(Stock<0){
      return res.status(500).redirect(`/admin/edit-product/${productId}?stockErr=Please enter a valid stock`);
    }

    const existingImages = existingProduct.image;
    const updatedImages = [];

    // Loop through the existing images to check if a new image is provided
    for (let i = 0; i < 5; i++) {
      let newImage;

      if (i === 4) {
        // Handle the main image (image[4])
        newImage = req.files["mainImage"];
      } else {
        // Handle other images (image[0] to image[3])
        newImage = req.files[`newProductImage${i}`];
      }

      const existingImage = existingImages[i];

      // Use the new image if provided, otherwise use the existing one
      const image = newImage ? newImage[0].filename : existingImage;

      updatedImages.push(image);
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
      return res.status(404).send("Product not found");
    }

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    const errorMessage = error.message || "Error updating product";
    const productsData = await products.find();
    const categories = await category.find();
    const brand = await brands.find();
    return res.status(500).render("./admin/products", {
      err: errorMessage,
      productsData,
      categories,
      brand,
    });
  }
};


const deleteProduct = async (req, res) => {
  const id = req.params.productid;

  const product = await getProductById(id);

  try {
    if (!product) {
      res.render("./admin/products", { err: "Product not found" });
      res.status(404);
    } else {
      await products.findByIdAndDelete(id);
      res.redirect("/admin/products");
    }
  } catch (error) {
    const productData = products.find();
    res.render("./admin/products", {
      err: "Error occured while deleting",
      products: productData,
    });
    res.status(500);
  }
};

// Customers get
const toCustomers = async (req, res) => {
  try {
    const usersData = await Users.find();
    res.render("./admin/customers", { title: "Customers", usersData });
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
  const categories = await category.find();
  res.render("./admin/categorymgt", { title: "Category", categories });
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
    if (!req.body.CategoryName || req.body.CategoryName.trim() == "") {
      const Category = await category.find();
      return res.render("./admin/editcategory", {
        err: "Please enter valid Category Name",
        Category,
      });
    }
    // Regex to check the categoryName contains only alphabets
    const lettersOnlyRegex = /^[A-Za-z/s]+$/;
    const categoryname = req.body.CategoryName;

    if (!lettersOnlyRegex.test(categoryname)) {
      const Category = await category.find();
      return res.render("./admin/editcategory", {
        err: "category must contain alphabets",
        Category,
      });
    }

    // check if the category is already exist
    const existingCategory = await category.find({
      CategoryName: categoryname,
    });
    if (existingCategory) {
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

      res.render("./admin/categorymgt", {
        msg: "Category Name updated successfully",
        categories,
      });
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

    const categories = await category.find();
    res.render("./admin/categorymgt", {
      msg: "Category deleted successfully",
      categories,
    });
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

const toProducts = async (req, res) => {
  try {
    // const idInBrand = await brands.find({}, "_id");
    // Extracting only the _id values from idInBrand array
    // const brandIds = idInBrand.map((brand) => brand._id);

    // Fetching products where brand field matches brandIds
    // const brandId = await products.find({ brand: { $in: brandIds } });
    // const brandNames = brandId.map((brand) => brand.brandName);

    const productsData = await getProductDetails();
    const categories = await category.find();
    const brand = await brands.find();

    res.render("./admin/products", { productsData, categories, brand });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

/*----------------------------brands------------------------*/

// To brands
const tobrands = async (req, res) => {
  const brand = await brands.find();
  res.render("./admin/brands", { title: "Brands", brand });
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
      
      res.render("./admin/editbrand", 
      { title: "Edit Brand",
       brand,
       imageErr:req.query.imgErr ,
       existingErr:req.query.existErr, });
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
  const existingLogo = await brands.findById(brandId)
  const logo = existingLogo.image

  const { brandName } = req.body;

  try {
    const brand = await brands.findById(brandId);
    if (!brand) {
      return res.status(404).render("./admin/brands", { err: "Brand not found" });
    }
    const existing = await brands.find({brandName:brandName})
    
    if(!req.file|| !req.file.filename){
      await brands.updateOne({_id:brandId},{$set:{brandName:brandName}})
      res.redirect(`/admin/brands`)
      return;
    }
    const files = req.file
    const filename = files.filename

    // Filter image files based on their extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp','.svg'];
    const imageFiles = imageExtensions.some(imageName => filename.includes(imageName))

    let redirectURL = `/admin/edit-brand/${brandId}?`;

    if(imageFiles==false){
      redirectURL += 'imgErr=only image files are accepted&';
    }

    
    if (redirectURL !== `/admin/edit-brand/${brandId}?`) {
        return res.status(500).redirect(redirectURL.slice(0, -1)); // Remove the trailing "&"
    }
    
    // Update brand fields
    const newBrand = new brands({
      brandName :brandName,
      addedDate : new Date(),
      image : req.file.filename
    })
    // Save the updated brand
    await newBrand.save();

    res.redirect("/admin/brands");
    console.log('brand updation success')
  } catch (error) {
    console.error(error);
    res.status(500).render("./admin/brands", { err: "Internal server error" });
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

module.exports = {
  loginAdmin,
  tologin,
  todashboard,
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
};
