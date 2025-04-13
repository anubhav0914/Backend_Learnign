import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudnary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefereshToken = async(userId)=>{

    try{
        const user = await User.findById(userId);
        const accessToken =  await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    }catch (error){
        throw new ApiError(500,"something went wrong while generating the access token ")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
 
        // fetch data from req
        // validation  non empty 
        // check user already exist 
        // check for image , check for avtar 
        // upload them to cloudnary , avtar check is uploaded or not 
        // user object - creation entry in db 
        // remove password and refresh token field from response 
        // check for user creation 
        // retrun res 
        


        // get data from body 
        const {fullName,email,username,password } = req.body
        console.log(fullName);


        // validation 
        if(
            [fullName,email,username,password].some((field)=>
                field?.trim() === ""
            )
        ){
            throw new ApiError(400,"All Field are required")
        }
        
        const  existedUser = await User.findOne({
            $or: [{ username },{ email }]
        })
        
        if (existedUser) {
            throw new ApiError(409,"User with email or username already exist")
        }
        const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;

        let coverImageLocalPath ;

        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
             coverImageLocalPath = req.files.coverImage[0].path
        }

        if(!avatarLocalPath){
            throw new ApiError(400,"Avtar files is required ")
        }
        
        const avatar = await uploadOnCloudnary(avatarLocalPath);
        const coverimage = await uploadOnCloudnary(coverImageLocalPath);
        // console.log(avatar);
        
        if(!avatar){
            throw new ApiError(400,"Avatar files is required 2")
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage : coverimage?.url || "",
            email,
            password,
            username:username.toLowerCase()
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if(!createdUser){
            throw new ApiError(500,"something went wrong while creating error ");
        }

        return res.status(201).json(
            new ApiResponse(200,createdUser,"User registerd sucessfully ")
        )
}) 


const loginUser = asyncHandler(async (req,res) =>{
     
    // fetch data from body 
    // found user (by user email or usename)
    // password decryption 
    // password verification 
    // generate access token 
    // generate refersh token 
    // send cookies
    // login successuflly 

    const {username,email,password} = req.body;
    if(!username && !email){
        throw new ApiError(400,"username and email is are required");
    } 

    // if(!(username || !email)){
    //     throw new ApiError(400,"username or password is required")
    // }
    // console.log(email);
    const user = await User.findOne({
        // $or : [{username},{email}]
        email
    }) 

    if(!user){
        throw new ApiError(404," user not found ")
    }

    const isPassowrd = await user.isPasswordCorrect(password)

    if(!isPassowrd){
        throw new ApiError(401,"Invalid user or Password")
    }

   const {accessToken,refreshToken} =  await generateAccessAndRefereshToken(user._id);
//    console.log("accessToken", accessToken)
//    console.log(user._id)
   const loggedinUser = await User.findById(user._id).
   select("-password -refreshToken")
   
   console.log(loggedinUser)
   const options = {
    httpOnly:true,
    
    secure:true

}

return res.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options).json(
    new ApiResponse(
        200,
        {
            user:loggedinUser,accessToken,refreshToken
        },
        "user loddege in succesfully"
    )
)
})

const logoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            },
         },
        {
            new:true
          }
    )

    const options = {
        httpOnly:true,
        secure:true
    
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .json(new ApiResponse(200,{},"User logged successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{

    const incomingRefeshToken = req.cookies.refreshToken || req.body.refreshToken ;

    if(!incomingRefeshToken){
        throw new ApiError(401,"unauthorized request")
    }
    
    try {
        const decodedToken =  jwt.verify(incomingRefeshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user =  User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401,"INvalid refreshToken")
        }
    
        if(incomingRefeshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used");
        }
        
        const options = {
            httpOnly:true,
            secure:true
        }
        
        const {accessToken,newrefreshToken} =await generateAccessAndRefereshToken(user._id);
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, 
                refreshToken: newrefreshToken,
                message: "accessToken refreshed succesfully"
                }
            )
        )
    } catch (error) {
         throw new ApiError(401, error?.message || "invalid refreesh token")
    }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}