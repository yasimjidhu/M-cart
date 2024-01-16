const users = require('../model/userSchema')
const address = require('../model/address')
const express = require('express')
const session = require('express-session')
const account = require('../Router/accountRouter')
const bcrypt = require('bcryptjs')
const countries = require('countries-list')
const pincode = require('india-pincode-lookup')
const { ObjectId } = require('mongodb');
const { use } = require('passport')
const coupon = require('../model/coupon')
const offerhelper = require('../helpers/offer')



// To profile
const  toProfile = async (req, res) => {
    const isAuthenticated = req.session.user ? true : false;
    const userEmail = req.session.email
    const userData = await users.findOne({email:userEmail})
    const userId = userData._id
    
    try {
        const userAddress = await address.aggregate([
            {
                $match:{
                    userId:userId
                }
            },
            { $unwind: "$address" },
            { $limit: 1 }
        ]).exec()

        const firstAddress = userAddress[0]; // Assuming the first address
        
        res.status(200).render('./user/profile', { firstAddress, userData,title:'Profile',isAuthenticated });
        
       
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}


// Upload profile image
const updateProfile = async (req, res) => {
    try {
        if (req.file) {
            // Array of accepted image MIME types
            const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', /* Add more types if necessary */];

            if (!acceptedImageTypes.includes(req.file.mimetype)) {
                // Invalid image file type

                return res.status(400).json({ error: 'Invalid image file type' });
            }

            // Proceed to update profile
            const updatedProfile = await users.findOneAndUpdate(
                { email: req.session.email },
                { profileImage: req.file.filename },
                { new: true }
            );

            if (updatedProfile) {
                res.status(200).json({ message: 'Profile photo updated successfully', success: true });
            } else {
                res.status(400).json({ error: 'User not found', success: false });
            }
        } else {
            res.status(400).json({ error: 'No file was uploaded' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
        console.error(err);
    }
};





// To addressBook
const toAddressBook = async (req, res) => {
    try {
        const userEmail = req.session.email;
        const user = await users.findOne({ email: userEmail });
        const isAuthenticated = req.session.user ? true : false;

        if (user) {
            const userId = user._id;

            const alladdress = await address.find({ userId: userId }, { _id: 0, address: 1 });
   
            const error = req.query.msg
            res.render('./user/addressBook', { alladdress,error,title:'AddressBook',isAuthenticated });
        } else {
            res.render('./user/addressBook', { alladdress: [],isAuthenticated }); // Render with empty address array if user not found
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// to Add address
const toAddAddress = (req,res)=>{
    const isAuthenticated = req.session.user ? true : false;
    res.render('./user/addAddressBook',{title:'Add Address',isAuthenticated})
}

// add Address Post 
const addAddress = async (req, res) => {
    try {
        const user = req.session.email;
        const userExist = await users.findOne({ email: user });
        const userId = userExist._id;

        const {
            fullName,
            phoneNumber,
            email,
            country,
            pinCode,
            state,
            district,
            city,
            area,
            street,
            building,
            houseNumber
        } = req.body;

        const newAddressData = {
            fullName,
            phoneNumber,
            email,
            country,
            pinCode,
            state,
            district,
            city,
            area,
            street,
            building,
            houseNumber
        };

        const existingAddress = await address.findOne({ userId: userId });
        if (existingAddress === null) {
            const newAddress = new address({
                userId,
                address: [newAddressData]
            });
            await newAddress.save();
  
            return res.status(201).json({ success: true });
        } else {
            if(existingAddress.address.length<3){
                await address.updateOne(
                    { userId },
                    { $push: { address: newAddressData } }
                );
             
                return res.status(201).json({ success: true });
            }else{
            
                return res.json({ success: false,message:"Maximum limit reached",limit:true});

                // return res.status(400).json({message:'Maximum address limit reached',success:false})
            }
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
        console.log(error);
    }
};

// Edit address 
const toEditAddress = async (req, res) => {
    const isAuthenticated = req.session.user ? true : false;
    const email = req.session.email;
    const addressId = req.params.addressId;
    
    try {
        const user = await users.findOne({ email: email });
        
        if (!user) {
            return res.status(404).redirect(`/account/addressBook?msg=User not found`);
        }

        const userId = user._id;

        const existingAddress = await address.findOne(
            { userId: userId, 'address._id': addressId },
            { _id: 0, 'address.$': 1 }
        );

        if (!existingAddress || !existingAddress.address || existingAddress.address.length === 0) {
            return res.status(404).redirect(`/account/addressBook?msg=Address not found`);
        }
        

        // Access the matched address object within existingAddress.address[0]
        res.render('./user/editAddress', { existingAddress ,title:'Edit Address',isAuthenticated});

    } catch (err) {
        console.error(err);
        // Handle error appropriately
    }
};

// Edit address 
const editAddress = async (req,res)=>{
    const addressId = req.params.addressId
    const userEmail = req.session.email
    
    try {
        const user = await users.findOne({email:userEmail})
        const userId = user._id

        const formData = {
            fullName:req.body.fullName,
            phoneNumber:req.body.phoneNumber,
            email:req.body.email,
            country:req.body.country,
            pinCode:req.body.pinCode,
            state:req.body.state,
            district:req.body.district,
            city:req.body.city,
            area:req.body.area,
            street:req.body.street,
            building:req.body.building,
            houseNumber:req.body.houseNumber
        }
        
        const updatedAddress = await address.findOneAndUpdate(
            {userId:userId,'address._id':addressId},
            {$set:{'address.$':formData}},
            {new:true}
        );

        if(!updatedAddress){
            return res.status(404).json({success:false,message:'Address not found'})
        }
        res.status(200).json({success:true,message:'Address Updated Successfully',updatedAddress})

    } catch (err) {
       console.error(err)
       res.status(500).json({success:false,message:'Internal server error'})
    }

}


// Delete Address
const deleteAddress = async (req, res) => {
    const userEmail = req.session.email;

    try {
        const user = await users.findOne({ email: userEmail });
        const userId = user._id;
        const addressId = req.params.addressId;

        const updatedAddress = await address.findOneAndUpdate(
            { userId },
            { $pull: { address: { _id: addressId } } }, // Locate the address using _id in the address array
            { new: true }
        );

        if (!updatedAddress) {
            return res.status(404).json({ message: 'Address not found for the user' });
        }

        return res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


// Get countries
const getCountriesList = (req, res) => {
    try {
        const countryList = Object.keys(countries.countries).map(countryCode => {
            const country = countries.countries[countryCode];
            return {
                name: country.name,
                code: countryCode, // Use the country code as the identifier
            };
        });

        res.json(countryList);
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



// Get location details by pincode
const getLocation = async (req, res) => {
    const userPincode = req.query.pincode;
    
    try {
        const AllLocationDetails = await pincode.lookup();
        const userLocationDetails = AllLocationDetails.filter(location=>{
            return location.pincode==userPincode
        })

        if(userLocationDetails.length>0){
            res.json(userLocationDetails[4]);
        }else{
            console.log('error')
            res.status(404).json({ error: 'Location details not found for the provided pincode' });
        }
        
    } catch (error) {
        console.error('Error fetching location details:', error);
        res.status(500).json({ error: 'Failed to fetch location details' });
    }
}


// Reset password
const ResetPassword = async (req,res)=>{
    const userEmail = req.session.email

    try {
        
        const {currentPassword,newPassword,confirmNewPassword} = req.body
        if(currentPassword===''||newPassword===''||confirmNewPassword===''){
    
            return res.status(404).json({message:'please fill all the fields',nullBody:true})
        }
        const userData = await users.findOne({email:userEmail})

        const userCurrentPass = userData.password

        const currentPasswordMatched = await bcrypt.compare(currentPassword,userCurrentPass)
        if(!currentPasswordMatched){
            return res.status(400).json({message:'incorrect password'})
        }else if(currentPasswordMatched&&newPassword!==confirmNewPassword){
            return res.status(400).json({message:'New password and confirm password doesnt match',unMatchPass:true})

        }else if(currentPasswordMatched&&newPassword===confirmNewPassword){

            const hashedPassword = await bcrypt.hash(newPassword,10)

            // UPDATE THE USER PASSWORD IN THE USER'S DOCUMENT
        const updatedUserPass = await users.findOneAndUpdate(
            {email:userEmail},
            {$set:{password:hashedPassword}},
            {new:true}
        )
        if(updatedUserPass){

            return res.status(200).json({message:'Password reset successfully',success:true})
        }else{
            
            return res.status(404).json({message:'user not found or password not updated',success:false})
        }
        }
        
    } catch (error) {
        console.log('error updating the passoword',error)
        throw error
        
    }
}

const toCrop = (req,res)=>{
    res.render('./user/imageCrop')
}

const cropImage = (req,res)=>{
    const croppedData = req.body

    res.status(200).json({success:true})
}

const editUserInfo = async (req,res,next)=>{
    const userEmail = req.session.email
    const user = await users.findOne({email:userEmail})
    const userId = user._id

    if(!req.body){
        return res.status(401).json({noBody:true})
    }

    const {name,state,phoneNumber} = req.body

    try{
        if(!user){
            return res.status(404).json({message:'User not found'})
        }

        const updatedFields = {};
        // Update only the fields that are provided and not empty
        if (name) {
            updatedFields.name = name;
        }
        
        if (state) {
            updatedFields.state = state;
        }
        if (phoneNumber) {
            updatedFields.phoneNumber = phoneNumber;
        }

        const updatedUser = await users.updateOne(
            { _id: userId },
            {
                $set: updatedFields
            }
        );
        return res.status(200).json({message:'user info updated successfully',success:false})

    }catch(err){
        next(err)
    }
}

// user coupons
const toUserCoupons = async (req,res)=>{

    try {
        const allCoupons = await coupon.find()
        const isAuthenticated = req.session.user ? true : false;
        res.render('./user/userCoupons.ejs',{allCoupons,isAuthenticated})
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    toProfile,
    toAddressBook,
    toAddAddress,
    addAddress,
    toEditAddress,
    getCountriesList,
    getLocation,
    deleteAddress,
    editAddress,
    updateProfile,
    ResetPassword,
    toCrop,
    cropImage,
    editUserInfo,
    toUserCoupons
}