function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate key error';
  } else if (err.status === 404) {
    res.status(404).render('./user/404');
    return; 
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