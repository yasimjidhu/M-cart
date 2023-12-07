const express = require('express')
const account = express.Router()
require('dotenv').config()
const accountController = require('../controller/accountController')
const userAuth = require('../middleware/userAuth')

//  to Profile
account.get('/profile',userAuth.profileAuth,accountController.toProfile)

// to Address Book
account.get('/addressBook',accountController.toAddressBook)

// Add address 
account.get('/addAddress',accountController.toAddAddress)
account .post('/addAddress',accountController.addAddress)
// account.p('/editAddress/:addressId')
account.post('/deleteAddress/:addressId',accountController.deleteAddress)

// Get countries
account.get('/countries',accountController.getCountriesList)

// Get location by pincode
account.get('/fetch-location',accountController.getLocation)

module.exports = account;

