import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudnary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
        
        const  existedUser = User.findOne({
            $or: [{ username },{ email }]
        })
        
        if (existedUser) {
            throw new ApiError(409,"User with email or username already exist")
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage[0]?.path;

        if(!avatarLocalPath){
            throw new ApiError(400,"Avtar files is required ")
        }

        const avatar = await uploadOnCloudnary(avatarLocalPath);
        const coverimage = await uploadOnCloudnary(coverImageLocalPath);
        
        if(!avatar){
            throw new ApiError(400,"Avtar files is required ")
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

export {registerUser}