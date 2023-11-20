const express = require('express')
const multer = require('multer')
const path = require('path')
// Multer setup
const storage = multer.diskStorage({
    destination:function(req,file,cb){
        
        // Destination folder for uploaded files
        cb(null,'./public/uploads/');
    },
    filename:function(req,file,cb){
        cb(null,Date.now()+path.extname(file.originalname));
    }
});

const upload = multer({storage:storage})

module.exports = upload;
