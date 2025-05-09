import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudnary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscription.models.js";
import mongoose from "mongoose";

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

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    
    const user = await User.findById(req.user?._id)
     
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(
        new ApiResponse(200,{},"Password Changed succesfully")
    )
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res.status(200)
    .json(
        200,
        req.user,
        "Current user fetched succesfully"
    )
})

const updateAccountDetils = asyncHandler( async (req,res)=>{
      const {fullName,email} = req.body

      if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
      }

      const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName,
                email : email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200,user,"Account Details UPdated successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
     
    const avtartLocalPath = req.file?.path

    if(!avtartLocalPath){
        throw new ApiError(400, "avtar image is missing ")
    }

    const avatar = await uploadOnCloudnary(avtartLocalPath)

    if(!avatar){
        throw new ApiError(400, "Error while uploading avatar")

    }
    
   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar :avatar.url
            }
        },
        {new:user}
    ).select("-password")

    return res.status(200)
    .json(
        200,
        user,
        "avatar image updated succesfully"
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
     
    const CoverImageLocalPath = req.file?.path

    if(!CoverImageLocalPath){
        throw new ApiError(400, "Cover Image image is missing ")
    }
     
    const coverImage = await uploadOnCloudnary(CoverImageLocalPath)

    if(!coverImage){
        throw new ApiError(400, "Error while uploading coverIMage")

    }
    
   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage :coverImage.url
            }
        },
        {new:user}
    ).select("-password")

    return res.status(200)
    .json(
        200,
        user,
        "CoverImage image updated succesfully"
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} =  req.params

    if(!username?.trim()){
        throw new ApiError(400,"user not defined ")
    }
    
    const channel =  await User.aggregrate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField :"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField :"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                email:1,
                subscribersCount:1,
                channelsSubscribedCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,channel[0],"User Channel fetched succesfullly")
    )
})

const  getWatchHistory = asyncHandler(async(req,res)=>{

    const user =  await User.aggregrate([
             {
                $match:{
                    _id:new mongoose.Types.ObjectId(req.user._id)
                }
             },
             {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
             }
    ]) 

    return  res.status(200)
    .json(
        200,
        user[0].getWatchHistory,
        "WatchHistory fetched successfully"
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateUserAvatar,
     updateAccountDetils,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory
    }