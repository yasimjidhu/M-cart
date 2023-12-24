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
account.get('/addressBook',userAuth.profileAuth,accountController.toAddressBook)


// Add address 
account.get('/addAddress',userAuth.profileAuth,accountController.toAddAddress)
account.post('/addAddress',userAuth.profileAuth,accountController.addAddress)



//edit address
account.get('/edit-address/:addressId',userAuth.profileAuth,accountController.toEditAddress)
account.post('/edit-address/:addressId',userAuth.profileAuth,accountController.editAddress)
account.post('/deleteAddress/:addressId',userAuth.profileAuth,accountController.deleteAddress)


account.get('/countries',accountController.getCountriesList)// Get countries
account.get('/fetch-location',accountController.getLocation)// Get location by pincode

// Reset Password
account.post('/reset-password',userAuth.profileAuth,accountController.ResetPassword)
account.post('/edit-UserInfo',userAuth.profileAuth,accountController.editUserInfo)


account.get('/crop',accountController.toCrop)
account.post('/cropImage',accountController.cropImage)
module.exports = account;

