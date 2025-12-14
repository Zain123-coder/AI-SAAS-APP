import React from 'react'
import {assets} from '../assets/assets'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {useClerk,UserButton,useUser} from '@clerk/clerk-react'



const Navbar = () => {


    const navigate=useNavigate()
    const {user}=useUser()
    const {openSignIn}=useClerk()
    
  
    return (
    

    <div className='fixed z-5 backdrop-blur-2xl  w-full text-center flex justify-between px-4 py-3 sm:px-20 xl:px-32 '>
         <img src={assets.logo} alt="" className='w-32 sm:w-44 cursor-pointer' onClick={()=>navigate('/')} />
        
        {
          user ? <UserButton />
           :
           (
            <button onClick={openSignIn} className='flex text-white px-4 py-2 gap-2 bg-primary rounded-full text-sm items-center cursor-pointer'>Get started <ArrowRight className='w-4 h-4'/></button>
          )
        }
        
        
        
    </div>
  )
}

export default Navbar