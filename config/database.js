//mongodb connection
const mongoose = require("mongoose");
require("dotenv").config()


module.exports = mongoose.connect(process.env.MONGODB_URI,{
    useNewUrlParser:true,
    useUnifiedTopology:false,
})
.then(()=>{
    console.log('connected to mongodb');
})
.catch((err)=>{
    console.log('error connecting to mongodb',err);
})