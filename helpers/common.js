const express = require('express')
const { ObjectId } = require('mongoose').Types;
const mongoose = require('mongoose')

// find the shipping charge based on the shippind method
const findShippingCharge = (shippingMethod)=>{

    let shippingCharge ;

    switch(shippingMethod){
        
        case 'standard':
            shippingCharge = 0;
            break;

        case 'express':
             shippingCharge = 100
             break;

        case 'sameDay':
            shippingCharge = 150;
            break;
        
        default :
            shippingCharge = 0
    }
    
    return shippingCharge
}


module.exports = {
    findShippingCharge
}