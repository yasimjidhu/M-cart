const Users = require("../model/userSchema");
const products = require("../model/productschema");
const { ObjectId } = require("mongodb");
const admin = require("../Router/adminRouter");
const category = require("../model/category");
const brands = require("../model/brands");
const { reset } = require("nodemon");

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
    res.render("./admin/adminhome", { title: "Admin Home", err: false });
  }else if(!email||!password){
    res.render('./admin/adminlogin',{err:'fill out this fields'})

  }else {
    console.log("admin login failed");
    res.render("./admin/adminlogin", { err: "Invalid email or password" });
  }
};

const tologin = (req, res) => {
  res.render("./admin/adminlogin", { title: "Login" });
};

const todashboard = (req, res) => {
  res.render("./admin/home", { title: "Admin Home" });
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
    const Brand = await brands.find()
    res.render("./admin/addproduct", {
      categories: Array.isArray(categories) ? categories : [],Brand
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

    res.render("./admin/products", { productsData, categories });
  } catch (err) {
    // Handle errors
    const ProductsData = await products.find();
    res.render("./admin/products", {
      title: "Products",
      err: "Error Occurred",
      products: ProductsData,
    });
    console.log(err);
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

    if (!product) {
      return res
        .status(404)
        .render("./admin/products", { err: "Product not found" });
    }

    res.render("./admin/editproduct", {
      Products: product,
      categories,
      err: req.query.err,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .render("./admin/products", { err: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { category, productName, price, description, brand, specifications } =
      req.body;
    let images = [];

    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.filename);
    } else {
      const existingProduct = await getProductById(productId);
      if (existingProduct) {
        images = existingProduct.image;
      }
    }
    console.log(images);

    // Fetch the product by ID
    const product = await getProductById(productId);

    if (!product) {
      return res.status(404).redirect("/admin/products?err=Product not found");
    } else {
      const result = await products.findByIdAndUpdate(productId, {
        $set: {
          category: category,
          productName: productName,
          price: price,
          image: images, // Set the updated images array
          description: description,
          specifications: specifications,
          brand: brand,
        },
      });

      if (result) {
        console.log("Product edited successfully");
        return res
          .status(200)
          .redirect(`/admin/products?err=Product updated successfully`);
      } else {
        console.log("Failed to update");
        return res
          .status(500)
          .redirect(
            `/admin/edit-product/${productId}?err=Failed to update product`
          );
      }
    }
  } catch (error) {
    console.error("Error updating product:", error);
    return res
      .status(500)
      .render("./admin/products", { err: "Error updating product" });
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
const addCategory = (req, res) => {
  console.log("add category called");

  try {
    const categoryName = req.body.CategoryName;

    const Category = new category({
      CategoryName: categoryName,
      createdAt: new Date(),
    });
    Category.save()
      .then((result) => {
        console.log("category added successfully");
        res.redirect("/admin/category");
      })
      .catch((err) => {
        console.log(err);
        console.log("error occured while adding category");
        res.render("./admin/addcategory", { err: "add category failed" });
      });
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
    console.log("toproducts called");
    const productsData = await getProductDetails();

    const categories = await category.find();
    res.render("./admin/products", { productsData, categories });
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
    const sales = req.body.sales;
    const stock = req.body.stock;

    if (!req.file) {
      res.render("./admin/addbrand", { title: "Add Brand" });
      res.status(400);
    }

    const newBrand = new brands({
      brandName: brandName,
      sales: sales,
      stock: stock,
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
      res.render("./admin/editbrand", { title: "Edit Brand", brand });
      console.log("admin entered to editbrand");
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    res.redirect("/admin/brands");
  }
};

// Update Brand
const updateBrand = async (req,res)=>{
    const brandId  = req.params.brandId;
    const {brandName,sales,stock}=req.body;;

    try{
        const brand = await brands.findById(brandId)
        if(!brand){
            return res.status(404).render('./admin/brands',{err:'Brand not found'})
        }

        // Update brand fields
        brand.brandName = brandName
        brand.sales = sales
        brand.stock = stock
        brand.addedDate = new Date()

        // check if a new logo is uploaded
        if(req.file){
            brand.image = req.file.filename
        }

        // Save the updated brand
        await brand.save()

        res.redirect('/admin/brands')
    }catch(error){
        console.error(error)
        res.status(500).render('./admin/brands',{err:'Internal server error'})
    }
}




// Soft deletion of brand
const blockBrand = async (req,res)=>{
    const id = req.params.brandId

    try{
        const brand = await brands.findById(id)

        if(!brand){
            res.status(404).render('./admin/brands',{err:'Brand not found'})
        }

        // Instead of physically deleting , mark the brand as false
        brand.brandStatus = false
        await brand.save()
        res.redirect('/admin/brands')
    }catch(error){
        console.error(error)
        res.status(500).render('./admin/brands',{err:'Error occured while soft deletion'})
    }
}



// Unblock brand
const unblockBrand =async (req,res)=>{
    const id = req.params.brandId

    try{
        
        const brand = await brands.findById(id)
        if(!brand){
            res.status(404).render('./admin/brands',{err:'No Brand found'})
        }

        brand.brandStatus = true;
        await brand.save()

        res.status(200).redirect('/admin/brands')
    }catch(error){
        console.error(error)
        res.status(500).render('./')
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
  unblockBrand
};
