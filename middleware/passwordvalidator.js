// const passwordValidator = require('password-validator')

// const schema = new passwordValidator();

// schema
// .is().min(8) // Minimum length is 8 characters
// .has().uppercase() // Must have uppercase
// .has().lowercase() //must have lowercase letter
// .has().digits() // must have digits
// .has().symbols() //must have symbols
// .is().not().spaces() // must not have spaces

// function validatePassword(){
//     var password = document.getElementById('password').value;
//     var msg = document.getElementById('passwordError');
//     var signupbutton = document.getElementById('signup-Button');

//     if(schema.validate(password)){
//         msg.innerHTML = "";
//         signupbutton.disabled = false;
//     }else{
//         msg.innerHTML = "password must meet the specified crieteria";
//         signupbutton.disabled = true;
//     }

// }
// module.exports={validatePassword}