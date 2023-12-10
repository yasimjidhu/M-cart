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



// To profile
const toProfile = async (req, res) => {
    const userEmail = req.session.email
    const userData = await users.findOne({email:userEmail})
    console.log('userdata is',userData)
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

        if (userAddress && userAddress.length > 0) {
            const firstAddress = userAddress[0]; // Assuming the first address
        
            console.log('lookuped data is ', firstAddress); 
            res.status(200).render('./user/profile', { firstAddress, userData });
        } else {
            res.redirect(`/user/tosignup?msg=user not found`);
        }
       
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}


// Upload profile image
const updateProfile  =async (req,res)=>{
    console.log('reqfile',req.file)

    try{
        if(req.file){
            const updatedProfile = await users.findOneAndUpdate(
                {email:req.session.email},
                {profileImage:req.file.filename},
                {new:true}
            )
            if(updatedProfile){
                res.status(200).json({message:'Profile photo updated successfully',success:true})
            }else{
                req.status(400).json({error:'user not found',success:false})
            }
        }else{
            res.status(400).json({error:'no file was uploaded'})
        }

    }catch(err){
        res.status(500).json({message:'internal server error'})
        console.error(err)
    }
}



// To addressBook
const toAddressBook = async (req, res) => {
    try {
        const userEmail = req.session.email;
        const user = await users.findOne({ email: userEmail });

        if (user) {
            const userId = user._id;
            console.log('userid',userId)

            const alladdress = await address.find({ userId: userId }, { _id: 0, address: 1 });
            console.log('all address',alladdress)
            const error = req.query.msg
            res.render('./user/addressBook', { alladdress,error });
        } else {
            res.render('./user/addressBook', { alladdress: [] }); // Render with empty address array if user not found
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// to Add address
const toAddAddress = (req,res)=>{
    res.render('./user/addAddressBook')
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
            console.log('Address added successfully');
            return res.status(201).json({ success: true });
        } else {
            if(existingAddress.address.length<3){
                await address.updateOne(
                    { userId },
                    { $push: { address: newAddressData } }
                );
                console.log('Address added successfully');
                return res.status(201).json({ success: true });
            }else{
                console.log('limit reached')
                return res.json({ success: false,message:"Maximum limit reached" });

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
        res.render('./user/editAddress', { existingAddress });

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
        console.log('address updated')
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
            console.log('userlocationdetails',userLocationDetails[4])
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
        console.log('reqbody',req.body)
        
        const {currentPassword,newPassword,confirmNewPassword} = req.body
        if(currentPassword===''||newPassword===''||confirmNewPassword===''){
            console.log('no req body')
            return res.status(404).json({message:'please fill all the fields',nullBody:true})
        }
        const userData = await users.findOne({email:userEmail})
        console.log('user data is',userData)
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
            console.log('password reset successfully',updatedUserPass)
            return res.status(200).json({message:'Password reset successfully',success:true})
        }else{
            console.log('user not found or password not updated')
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

    console.log('cropped data',croppedData)
    res.status(200).json({success:true})
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
    cropImage
}