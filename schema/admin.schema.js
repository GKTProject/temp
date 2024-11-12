import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        default: 'Admin'
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
    otp:{
        type: String
    },
    otpExpires:{
        type: Date
    },
    videos:{
        freeBusiness:[
            {
                hindiFilePath: String,
                englishFilePath: String,
                thumbnailFilePath:String,
                text: String
            }
        ],
        paidBusiness:[
            {
                hindiFilePath: String,
                englishFilePath: String,
                thumbnailFilePath:String,
                text: String,
                price: Number
            }
        ],
        freeGreatK:[
            {
                hindiFilePath: String,
                englishFilePath: String,
                thumbnailFilePath:String,
                text: String
            }
        ]
    },
    banners:{
        freeBusinessBannerPath:{
            type: String
        },
        paidBusinessBannerPath:{
            type: String
        },
        freeGreatKBannerPath:{
            type: String
        }
    },
    reviews:[{
        text:{
            type: String
        },
        time:{
            type: Date,
            default: Date.now
        },
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username:{
            type: String
        }  
    }]
});

export const AdminModel = mongoose.model('Admin', adminSchema);