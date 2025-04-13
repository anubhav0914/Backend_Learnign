
import mongoose, {Schema} from "mongoose"

const scubscriptionSchema  = new Schema(
    {
       subscriber :{
        type:Schema.Types.ObjectId, // one who is subcriing 
        ref:"User"
       },
       channel:{
        type:Schema.Types.ObjectId, // one who is subcrber is subscrbing 
        ref:"User"
       }
    },
   { timestamps:true}
)

export const Subscription =  mongoose.model("Subscription",scubscriptionSchema)