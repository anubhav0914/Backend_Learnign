import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


 // Configuration
 cloudinary.config({ 
    cloud_name: process.env.CLOUDNARY_NAME, 
    api_key: process.env.CLOUDNARY_API_KEY, 
    api_secret: process.env.API_SECRET 
});

const uploadOnCloudnary = async (localFilePath) =>{
      try{
     if(!localFilePath) return null
           //upload the file on cloudnary 
           const response = await  cloudinary.uploader.upload(localFilePath,{
             resource_type: "auto"
           })
           // file has been uploaded successfully 
          //  console.log("File uploaded successfully on cloudnary");
          //  console.log(response.url);
          fs.unlinkSync(localFilePath); // automatically delet the localy saved fiels
           return response;
      }
      catch (error){ 
          fs.unlinkSync(localFilePath); // remove the file locally saved temporary file as the upload operation failed 
          return null;
      }
}

export {uploadOnCloudnary};