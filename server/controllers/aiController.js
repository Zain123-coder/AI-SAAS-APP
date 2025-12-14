// import { response } from "express";
// https://clipdrop.co/apis/docs/text-to-image

import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import PDFParser from "pdf2json";

import { upload } from "../configs/multer.js";
import FormData from "form-data";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
//import pdf from 'pdf-parse/lib/pdf-parse.js'
//import pdfParse from "pdf-parse/dist/cjs/pdf-parse.js";


const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan != 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached.Upgrade to premium to continue" })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
            
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0,
            max_tokens: length,
        });

        const content = response.choices[0].message.content

        await sql`INSERT INTO creations (user_id ,prompt, content, type)  VALUES (${userId},${prompt},${content},'article')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1

                }
            })

 
        }

        res.json({ success: true, content })


    } catch (error) {

        console.log(error.message)
        res.json({ success: false, message: error.message })



    }
}


export const generateBlogTitle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan != 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached.Upgrade to premium to continue" })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
            max_tokens: 100,
        });

        const content = response.choices[0].message.content

        await sql`INSERT INTO creations (user_id ,prompt, content, type)  VALUES (${userId},${prompt},${content},'blog-title')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1

                }
            })


        }

        res.json({ success: true, content })


    } catch (error) {

        console.log(error.message)
        res.json({ success: false, message: error.message })



    }
}







export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;


        if (plan != 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscription" })
        }

        const formData = new FormData()
        formData.append('prompt', 'shot of vaporwave fashion dog in miami')

       const {data}= await axios.post("https://clipdrop-api.co/text-to-image/v1" ,formData,{
            headers: {'x-api-key': process.env.
            CLIPDROP_API_KEY,},
            responseType: "arraybuffer",

        })
       
        const base64Image=`data:image/png;base64,${Buffer.from(data,'binary').toString('base64')}`;
         
       const {secure_url}=await cloudinary.uploader.upload(base64Image)





        await sql`INSERT INTO creations (user_id ,prompt, content, type,publish)  VALUES (${userId},${prompt},${secure_url},'image',${publish ?? false})`;

       

        res.json({ success: true, content:secure_url })


    } catch (error) {

        console.log(error.message)
        res.json({ success: false, message: error.message })



    }
}







export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
       
       const image=req.file;
        const plan = req.plan;


        if (plan != 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscription" })
        }

       
         
       const {secure_url}=await cloudinary.uploader.upload(image.path,{
        transformation:[
            {
                effect:'background_removal',
                background_removal:'remove_the_background'
            }
        ]
       })





        await sql`INSERT INTO creations (user_id ,prompt, content, type)  VALUES (${userId},'Remove background from image', ${secure_url},'image' )`;

       

        res.json({ success: true, content:secure_url })


    } catch (error) {

        console.log(error.message)
        res.json({ success: false, message: error.message })



    }
}





export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
       const {object}=req.body;
        const plan = req.plan;
        const image=req.file;


        if (plan != 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscription" })
        }

       
         
       const {public_id}=await cloudinary.uploader.upload(image.path)

       const imageUrl=cloudinary.url(public_id,{
        transformation:[{effect: `gen_remove:${object}`}],
        resource_type:'image'

       })



        await sql`INSERT INTO creations (user_id ,prompt, content, type)  VALUES (${userId},${`Removed ${object} from image`}, ${imageUrl},'image' )`;

       

        res.json({ success: true, content:imageUrl })


    } catch (error) {

        console.log(error.message)
        res.json({ success: false, message: error.message })



    }
}




export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;
    const resume = req.file;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium users",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file size exceeds 5MB",
      });
    }

    const filePath = resume.path;

    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err) => {
      return res.json({ success: false, message: err.parserError });
    });

    pdfParser.on("pdfParser_dataReady", async (pdfData) => {
      const text = pdfParser.getRawTextContent();

      const prompt = `
      Review the following resume and provide strengths, weaknesses and suggestions:
      ${text}
      `;

      const response = await AI.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;

      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
      `;

      return res.json({ success: true, content });
    });

    pdfParser.loadPDF(filePath);
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};








// export const resumeReview = async (req, res) => {
//     try {
//         const { userId } = req.auth();
       
//         const plan = req.plan;
//         const resume=req.file;


//         if (plan != 'premium') {
//             return response.json({ success: false, message: "This feature is only available for premium subscription" })
//         }

//        if(resume.size > 5 * 1024 * 1024){
//         return res.json({success: false, message: "Resume file size exceeds allowed size (5MB)"})
//        }
         
//        const dataBuffer=fs.readFileSync(resume.path)
//       const pdfData = await pdf(dataBuffer);
//        //const pdfData =await pdf(dataBuffer)

//        const prompt= `Review the following resume and provide constructive feedback on its strengths,weaknesses,and areas for improvement.Resume Content:\n\n${pdfData.text}`

//          const response = await AI.chat.completions.create({
//             model: "gemini-2.0-flash",
//             messages: [
                
//                 {
//                     role: "user",
//                     content: prompt,
//                 }
//             ],
//             temperature: 0.7,
//             max_tokens: 1000,
//         });

//         const content = response.choices[0].message.content

       



//         await sql`INSERT INTO creations (user_id ,prompt, content, type)  VALUES (${userId},'Review the uploaded resume' , ${content},'resume-review' )`;

       

//         res.json({ success: true, content })


//     } catch (error) {

//         console.log(error.message)
//         res.json({ success: false, message: error.message })



//     }
// }