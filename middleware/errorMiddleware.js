// Custom error handling middleware
function errorHandler(err, req, res, next) {
    let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    let message = 'Internal Server Error';
  
    if (err.name === 'ValidationError') {
      // Handling validation errors
      statusCode = 400; // Bad Request
      message = err.message;
    } else if (err.name === 'MongoError' && err.code === 11000) {
      // Handling duplicate key (MongoDB) errors
      statusCode = 400; // Bad Request
      message = 'Duplicate key error';
    }
  
    res.status(statusCode).json({
      success: false,
      error: {
        message: message,
        stack: process.env.NODE_ENV === 'production' ? 'Error details are hidden in production' : err.stack,
      },
    });
  }
  
  module.exports = errorHandler;