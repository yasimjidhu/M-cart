const mongoose = require("mongoose");
const cron = require("node-cron");
const productOffer = require("../model/productOffer");
const products = require("../model/productschema");
const coupons = require("../model/coupon");

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
    // console.log('running')
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
          { _id: offer.productId },
          {
            $unset: {
              offerPrice: "",
              offerType: "",
              offerExpiryDate: "",
              discountedPrice:""
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


module.exports = {
  couponChecker,
  productOfferChecker
};
