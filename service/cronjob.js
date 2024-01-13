const mongoose = require("mongoose");
const cron = require("node-cron");
const productOffer = require("../model/productOffer");
const products = require("../model/productschema");
const coupons = require("../model/coupon");
const categoryOffer = require("../model/categoryOffer");

// cron job to check and update product offers
const couponChecker = () => {
  cron.schedule("*/10 * * * * *", async () => {
    try {
      //get all coupons which are expired
      const expiredCoupons = await coupons.find({
        endDate: { $lt: new Date() },
      });
      if (expiredCoupons.length > 0) {
        // Delete the expired
        expiredCoupons.forEach(async (coupon) => {
          await coupons.findByIdAndDelete(coupon._id);
          console.log(`coupon ${coupon._id} has expired and been deleted`);
        });
        console.log("Expired coupons deleted successfully");
      }
    } catch (err) {
      console.error(err);
    }
  });
};

// function to check the productOffer is expired or not
const productOfferChecker = () => {
  cron.schedule("*/10 * * * * *", async () => {
    try {
      // Find expired product offers
      const expiredOffers = await productOffer.find({
        endDate: { $lte: new Date() },
      });

      for (const offer of expiredOffers) {
        // Delete the expired offer
        await productOffer.findByIdAndDelete(offer._id);

        // Find and update the associated products to remove offer details
        await products.updateMany(
          { _id: offer.productId, offerType: 'productOffer' },
          {
            $set: {
              offerType: null,
              discountedPrice: 0,
            }
          }
        );
      }

      // console.log("Expired offers handled successfully.");
    } catch (error) {
      console.error("Error handling expired offers:", error);
    }
  });
};

// category offer checker
const categoryOfferChecker = () =>{
  cron.schedule("*/10 * * * * *",async ()=> {
    try{
      // find expired category offers
      const expiredCategoryOffers = await categoryOffer.find({
        endDate:{$lte:new Date()}
      });

      for(const offer of expiredCategoryOffers){
        //delete the expired offer
        await categoryOffer.findByIdAndDelete(offer._id);

        // find and update the associated products to remove offer details
        await products.updateMany(
          {category:offer.categoryId,offerType:'categoryOffer'},
          {
            $set:{
              offerType:null,
              discountedPrice:0
            }
          }
        )
      }

      // console.log('expired category offer deleted successfully')
    }catch(err){
      console.error(err)
    }
  })
}

module.exports = {
  couponChecker,
  productOfferChecker,
  categoryOfferChecker
};
