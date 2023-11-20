const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  CategoryName: {
    type: String,
    unique:true,
    required:true
  },
  createdAt:{type:Date}
});

const Category = mongoose.model("Categories", CategorySchema);

module.exports = Category;