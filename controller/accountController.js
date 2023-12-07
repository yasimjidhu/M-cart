const users = require('../model/userSchema')
const address = require('../model/address')
const express = require('express')
const session = require('express-session')
const account = require('../Router/accountRouter')
const countries = require('countries-list')
const pincode = require('india-pincode-lookup')

// To profile
const toProfile = (req, res) => {
    try {
        res.render('./user/profile')
        }catch(err){
            console.log(err)
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
            res.render('./user/addressBook', { alladdress });
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
            await address.updateOne(
                { userId },
                { $push: { address: newAddressData } }
            );
            console.log('Address added successfully');
            return res.status(201).json({ success: true });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
        console.log(error);
    }
};

// Edit address 
const editAddress = (req,res)=>{
    const addressId = req.params.addressId

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


module.exports = {
    toProfile,
    toAddressBook,
    toAddAddress,
    addAddress,
    getCountriesList,
    getLocation,
    deleteAddress
}