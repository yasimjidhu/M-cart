const express = require('express')
const admin= express.Router()
const User = require('../model/userSchema')
const adminController = require('../controller/admincontroller')
const adminauth = require('../middleware/adminAuth')
const products = require('../model/productschema')
const category = require('../model/category')


// Import multer and set up the storage for file uploads
const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/'); // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

// const upload = multer({ storage: storage });



admin.get('/',adminauth.adminExist,adminController.tologin);
admin.post('/login',adminController.loginAdmin)
admin.get('/logout',adminController.toLogout)



admin.get('/dts',(req,res)=>{
    res.render('./user/productdetails')
})

admin.get('/dashboard',adminauth.verifyAdmin,adminController.todashboard)
admin.get('/customers',adminauth.verifyAdmin,adminController.toCustomers)

// Products
admin.get('/products',adminauth.verifyAdmin,adminController.toProducts)
admin.get('/add-product',adminauth.verifyAdmin,adminController.toaddProduct)
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Check file types here if needed
        cb(null, true);
    }
});

admin.post('/add-product', upload.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'productImage4', maxCount: 1 },
    { name: 'mainImage', maxCount: 1 }
]),(req, res) => {
    // Your existing code
    adminController.addproducts(req, res);
});

admin.get('/edit-product/:productid',adminauth.verifyAdmin,adminController.toEditProduct)

admin.post('/edit-product/:productId', upload.fields([
    { name: 'newProductImage1', maxCount: 1 },
    { name: 'newProductImage2', maxCount: 1 },
    { name: 'newProductImage3', maxCount: 1 },
    { name: 'newProductImage4', maxCount: 1 },
    { name: 'mainImage', maxCount: 1 }
]), adminController.updateProduct);

admin.post('/delete-product/:productid',adminauth.verifyAdmin,adminController.deleteProduct)


// Block user get
admin.get('/block/:userId', adminController.blockUser);
admin.get('/unblock/:userId', adminController.unblockUser);


// Category management
admin.get('/category',adminauth.verifyAdmin,adminController.toCategory)
admin.get('/add-category',adminauth.verifyAdmin,adminController.toaddcategory)
admin.post('/add-category',adminauth.verifyAdmin,adminController.addCategory)
admin.get('/edit-category/:categoryId',adminauth.verifyAdmin,adminController.toEditCategory)
admin.post('/edit-category/:categoryId',adminauth.verifyAdmin,adminController.editCategory)
admin.post('/delete-category/:categoryId',adminauth.verifyAdmin,adminController.deleteCategory)


// Brands
admin.get('/brands',adminauth.verifyAdmin,adminController.tobrands)
admin.get('/add-brand',adminauth.verifyAdmin,adminController.toAddBrand)
admin.post('/add-brand', upload.single('logo'), adminController.addBrand);
admin.get('/edit-brand/:brandId',adminauth.verifyAdmin,adminController.toEditBrand)
admin.post('/edit-brand/:brandId',adminauth.verifyAdmin,upload.single('logo'),adminController.updateBrand)
admin.post('/block-brand/:brandId', adminauth.verifyAdmin,adminController.blockBrand)
admin.post('/unblock-brand/:brandId',adminauth.verifyAdmin,adminController.unblockBrand)


// Orders
admin.get('/orders',adminController.toOrders)
admin.put('/updateOrderStatus',adminController.updateOrderStatus)
module.exports = admin