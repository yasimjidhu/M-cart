const mongoose = require('mongoose')
const {ObjectId} = mongoose.SchemaTypes;

const feedbackSchema = new mongoose.Schema({
    userId:{
        type:mongoose.ObjectId,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    allFeedbacks:[{
        
        subject:{
            type:String,
            required:true
        },
        message:{
            type:String,
            required:true
        },
        sentDate:{
            type:Date
        }
    }]
})

const feedbacks = mongoose.model('feedbacks',feedbackSchema)
module.exports = feedbacks