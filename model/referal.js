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
});

const referal = mongoose.model('referal',referalSchema)
module.exports = referal