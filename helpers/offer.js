const express = require('express')

//function for generate referl link
function generateReferralCode(userId) {
    const baseUrl = 'https://m-cart.onrender.com/tosignup?userId=';
    return baseUrl + userId;
  }
  
  module.exports ={
    generateReferralCode
  }