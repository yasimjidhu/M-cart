const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './public/uploads/profile_images/';
        
        // Create the upload directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdir(uploadDir, { recursive: true }, (err) => {
                if (err) {
                    console.error('Error creating upload directory:', err);
                    cb(err, null);
                } else {
                    cb(null, uploadDir);
                }
            });
        } else {
            cb(null, uploadDir);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;