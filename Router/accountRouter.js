const express = require('express')
const account = express.Router()
require('dotenv').config()
const accountController = require('../controller/accountController')
const userAuth = require('../middleware/userAuth')
const upload = require('../service/profileImage')



//  to Profile
account.get('/profile',userAuth.profileAuth,accountController.toProfile)
account.post('/uploadCroppedImage',upload.single('profileImage'),accountController.updateProfile)


// to Address Book
account.get('/addressBook',accountController.toAddressBook)


// Add address 
account.get('/addAddress',accountController.toAddAddress)
account .post('/addAddress',accountController.addAddress)



//edit address
account.get('/edit-address/:addressId',accountController.toEditAddress)
account.post('/edit-address/:addressId',accountController.editAddress)
account.post('/deleteAddress/:addressId',accountController.deleteAddress)


account.get('/countries',accountController.getCountriesList)// Get countries
account.get('/fetch-location',accountController.getLocation)// Get location by pincode

// Reset Password
account.post('/reset-password',accountController.ResetPassword)



account.get('/crop',accountController.toCrop)
account.post('/cropImage',accountController.cropImage)
module.exports = account;

