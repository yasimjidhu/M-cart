const mongoose = require("mongoose");

const referalSchema = mongoose.Schema({
  offerAmount: {
    type: Number,
  },
  updatedDate: {
    type: Date,
  },
  status: {
    type: Boolean,
  },
  joinedUser: [
    {userId:{
      type: mongoose.Types.ObjectId,
    }},
  ],
  invitedUser: [
    {
      userId: {
        type: mongoose.Types.ObjectId,
      },
    },
  ],
  maxUsage:{
    type:Number
  },
  validFrom:{
    type:Date,
  },
  validUntil:{
    type:Date
  }
});

const referal = mongoose.model('referal',referalSchema)
module.exports = referal