import bcrypt from 'bcrypt';
import { UserModel } from '../schema/user.schema.js';
import { AdminModel } from '../schema/admin.schema.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendMail from '../config/nodeMailer.config.js';



class AuthController{

    async adminAuth(req, res){
        try {
            const role = req.role;
            if(role !== 'admin'){
                return res.status(401).json({message: 'Unauthorized'});
            }
            res.status(200).json({message: 'Authorized'});
        }
        catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

    async adminSignIn(req, res){
        try {
            const {email, password} = req.body;

            if(!email || !password){
                return res.status(400).json({message: 'All fields are required'});
            }
            const admin = await AdminModel.findOne({email});
            if(!admin){
                return res.status(400).json({message: 'Invalid Email'});
            }

            const isPasswordCorrect =await bcrypt.compare(password, admin.password);
            if(!isPasswordCorrect){
                return res.status(400).json({message: 'Invalid Password'});
            }
            const token = jwt.sign(
                {
                    userId: admin._id,
                    email: admin.email,
                    role: 'admin'
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn: '24h'
                }
            );
            res.status(200).json({token,userId:admin._id});
        } catch (error) {
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

    async adminResetPassword(req, res){
        const {email} = req.body;
        try {
            const admin = await AdminModel.findOne({email});
            if(!admin){
                return res.status(400).json({message: 'Invalid Email'});
            }
            //Create 6 digit OTP using crypto
            const otp =await crypto.randomInt(100000, 999999);
            const otpExpires = new Date(Date.now()+5*60*1000);//5 minutes
            console.log(otp);
            admin.otp = otp;
            admin.otpExpires = otpExpires;
            admin.password = null;
            await admin.save();
            sendMail(email, 'OTP Verification', `Your OTP is ${otp}`);
            res.status(200).json({message: 'OTP sent to your email'});
        }catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

    async adminVerify(req, res){
        const {email, otp, password} = req.body;
        try {
            const admin = await AdminModel.findOne({email
            });
            if(!admin){
                return res.status(400).json({message: 'Invalid Email'});
            }
            if(admin.otp !== otp){
                return res.status(400).json({message: 'Invalid OTP'});
            }
            const currentTime = new Date(Date.now());
            if(admin.otpExpires < currentTime){
                return res.status(400).json({message: 'OTP Expired'});
            }
            admin.password =await bcrypt.hash(password, 12);
            admin.otp = null;
            admin.otpExpires = null;
            await admin.save();
            res.status(200).json({message: 'Account Verified Successfully'});
        }catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

    async userAuth(req, res){
        try {
            res.status(200).json({message: 'Authorized'});
        }
        catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

    async signUp(req, res){
        try {
            var {name, age, gender, address, email, referredBy} = req.body;

            //Check if all fields are provided
            if(!name || !age || !gender || !address || !email){
                return res.status(400).json({message: 'All fields are required'});
            }

            gender = gender.toLowerCase();
            email = email.toLowerCase();

            //Check is age is a number
            if(isNaN(age)){
                return res.status(400).json({message: 'Age must be a number'});
            }

            //Check if gender is valid
            if(gender!='male' && gender!='female' && gender != 'other'){
                return res.status(400).json({message: 'Gender must be either one of these. Male, Female, Other'});
            }

            //Check if email is valid
            if(!email.includes('@') || !email.includes('.')){
                return res.status(400).json({message: 'Email is invalid'});
            }

            if(!referredBy){
                referredBy = null;
            }

            //Create 6 digit OTP using crypto
            const otp = crypto.randomInt(100000, 999999);
            const otpExpires = new Date(Date.now()+5*60*1000);//5 minutes

            
            try {
                //Send the OTP to the user's email
                sendMail(email, 'OTP Verification', `Your OTP is ${otp}`);

                const exitingUser = await   UserModel.findOne({email});

                if(exitingUser){
                    if(exitingUser.verified){
                        return res.status(400).json({message: 'User already exists with this email'});
                    }
                    //Update the user with new OTP
                    exitingUser.otp = otp;
                    exitingUser.otpExpires = otpExpires;
                    await exitingUser.save();
                    return res.status(200).json({
                        customCode: 200,
                        message: 'User Already Exist, Verify Account. OTP sent to your email'
                    });
                }

                //Save the user to the database
                const user = new UserModel({
                    name,
                    age,
                    gender,
                    address,
                    email,
                    otp,
                    otpExpires,
                    referredBy,
                });
                await user.save();

                if(referredBy){
                    const referringUser = await UserModel.findOne({referralCode: referredBy});
                    if(!referringUser){
                        return res.status(400).json({message: 'Invalid Referral Code'});
                    }
                    referringUser.referredUsers.push({
                        user: user._id,
                        time: Date.now(),
                        subscribed: false
                    });
                    await referringUser.save();
                }

                res.status(200).json({ 
                    customCode: 201,
                    message: 'Sign Up successful. OTP sent to your email.' 
                });
            } catch (error) {
                console.log(error);
                return res.status(500).json({message: 'Internal Server Error'});
            }
            
        } catch (error) {
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
        
    }

    async signIn(req, res){
        try {
            var {email, password} = req.body;
            email = email.toLowerCase();
    
            //Check if email is valid
            if(!email.includes('@') || !email.includes('.')){
                return res.status(400).json({message: 'Email is invalid'});
            }
    
            //Validate the user
            const user = await UserModel.findOne({email});
            if(!user){
                return res.status(400).json({message: 'Invalid Email'});
            }

            if(!user.verified){
                 //Create 6 digit OTP using crypto
                const otp = crypto.randomInt(100000, 999999);
                const otpExpires = new Date(Date.now()+5*60*1000);//5 minutes
                user.otp = otp;
                user.otpExpires = otpExpires;
                await user.save();
                sendMail(email, 'OTP Verification', `Your OTP is ${otp}`);
                return res.status(200).json({
                    customCode: 200,
                    message: 'Account not verified, OTP sent to your email'
                });
            }
    
            //Check if password is correct
            const isPasswordCorrect =await bcrypt.compare(password, user.password);
            if(!isPasswordCorrect){
                return res.status(400).json({message: 'Invalid Password'});
            }

            //Generate JWT token
            const token = jwt.sign(
                {   
                    userId: user._id,
                    email: user.email
                }, 
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn: '24h'
                }
            );
            res.status(200).json({token,userId: user._id});
        } catch (error) {
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
       

    }

    //Verify OTP and Set New Password
    async verify(req, res){
        const {email, otp, password} = req.body;
        try {
            const user = await UserModel.findOne({email});
            if(!user){
                return res.status(400).json({message: 'Invalid Email'});
            }
            if(user.otp !== otp){
                return res.status(400).json({message: 'Invalid OTP'});
            }
            const currentTime = new Date(Date.now());
            console.log(user.otpExpires,"---", new Date(Date.now()));
            if(user.otpExpires < currentTime){
                console.log(user.otpExpires,"---", new Date(Date.now()));
                return res.status(400).json({message: 'OTP Expired'});
            }
            user.verified = true;
            user.password =await bcrypt.hash(password, 12);
            user.otp = null;
            user.otpExpires = null;
            await user.save();
            res.status(200).json({message: 'Account Verified Successfully'});
        }catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

    async resetPassword(req, res){
        const {email} = req.body;
        try {
            const user = await UserModel.findOne({email});
            if(!user){
                return res.status(400).json({message: 'Invalid Email'});
            }
            //Create 6 digit OTP using crypto
            const otp = crypto.randomInt(100000, 999999);
            const otpExpires = new Date(Date.now()+5*60*1000);//5 minutes
            user.otp = otp;
            user.otpExpires = otpExpires;
            user.password = null;
            await user.save();
            sendMail(email, 'OTP Verification', `Your OTP is ${otp}`);
            res.status(200).json({message: 'OTP sent to your email'});
        }catch(error){
            console.log(error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }

}

export default AuthController;