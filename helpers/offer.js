const express = require('express')

//function for generate referl link
function generateReferralCode(userId) {
    const baseUrl = 'http://localhost:3000/user/tosignup?userId=';
    return baseUrl + userId;
  }
  
  module.exports ={
    generateReferralCode
  }