// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:"./env"
}
)


connectDB()
.then(()=>{
    app.on("error",(err)=>{
        console.log(`error`,err);
        throw err
    })
    app.listen(process.env.PORT || 8001,()=>{
        console.log(`Server is running on the port ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log(`databse connection failed`,err)
})























/*

FIRST APPROCH OF CONNECTING THE DATA

import express from "express"

const app = express()


;(async () => {

    try{
        await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",()=>{
            console.log("error",error);
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on ${process.env.PORT} `);
        })
    }
    catch (error){
        console.log("error", error)
        throw error
    }

})() */
