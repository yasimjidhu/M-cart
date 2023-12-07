const verifyUser = (req,res,next)=>{
    if(req.session.userlogged){
        next()
    }else{
        res.redirect('/')
    }
};

const userExist = (req,res,next)=>{
    if(req.session.userlogged){
        res.redirect('/user/home')
    }else{
        next()
    }
};

const profileAuth = (req,res,next)=>{
    if(req.session.userlogged){
        next()
    }else{
        res.redirect('/user/tosignup')
    }
}


module.exports = {
    verifyUser,
    userExist,
    profileAuth
}
