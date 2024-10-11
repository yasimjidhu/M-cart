const express = require('express')

//function for generate referl link
function generateReferralCode(userId) {
    const baseUrl = 'http://localhost:2000/tosignup?userId=';
    return baseUrl + userId;
  }
  
  module.exports ={
    generateReferralCode
  }