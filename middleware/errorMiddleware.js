// const errorHandler = (err,req,res,next)=>{
//     let status = err.status || 500
//     let message = err.message || 'internal server error'
//     console.log('error middleware called')
//     if(err.name==='notFound'){
//         status = 404
//     }

//     res.status(status).json({
//         error:{
//             message:message,
//             status:status
//         }
//     });
    
// }

// module.exports = {
//     errorHandler
// }