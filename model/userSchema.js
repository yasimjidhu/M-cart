const mongoose = require('mongoose')
const schema = mongoose.Schema;
const connection = require('../config/database')

const userSchema = mongoose.Schema({
    name: {
        // required: true,
        type: String
    },
    email: {
        required: true,
        type: String,
        unique: true
    },
    password:{
        type:String,
    },
    profileImage:{
        type:String,
        required:false
    },
    emailAuth:{
        type:Boolean,
        default:false
    },
    joinDate:{
        type:Date
    },
    status:{
        type:Boolean,
        default:true
    },
    otp:{
        type:Number,
        
    },
    state:{
        type:String
    },
    phoneNumber:{
        type:Number
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' }, 
    
});

const Users = mongoose.model('users', userSchema);
module.exports = Users;



