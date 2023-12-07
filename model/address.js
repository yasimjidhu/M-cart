const mongoose = require('mongoose')
const {ObjectId} = mongoose.SchemaTypes;

const addressSchema = mongoose.Schema({
    userId:{
        type:mongoose.ObjectId,
        required:true
    },
    address:[{
        fullName:{
            type:String,
            required:true
        },
        phoneNumber:{
            type:String,
            required:true
        },
        email:{
            type:String,
            required:true
        },
        country:{
            type:String,
            required:true
        },
        pinCode:{
            type:Number,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        district:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        area:{
            type:String,
            required:true
        },
        street:{
            type:String,
            required:true
        },
        building:{
            type:String,
            required:true
        },
        houseNumber:{
            type:String,
            required:true
        },       
    }],
    status:{
        type:Boolean,
        deafult:true
    }
    // },{
    // timeStamps:true,
})

const address = mongoose.model('address',addressSchema);

module.exports = address
