import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import AiTools from '../components/AiTools'
import Testimonail from '../components/Testimonail'
import Footer from '../components/Footer'
import Plan from '../components/Plan'

const Home = () => {
  return (
    <div>
        <Navbar />
        <Hero />
        <AiTools />
        <Testimonail />
        <Plan />
        <Footer />
    </div>
  )
}

export default Home