import React from 'react';

const SocialIcon = ({ platform }) => {
  const icons = {
    instagram: (
      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="group-hover:fill-black transition duration-300" d="M9.50959 2.32296C11.8432 2.32296 12.12 2.3317 13.042 2.37394C15.4106 2.48173 16.5169 3.60556 16.6247 5.95664C16.667 6.87799 16.675 7.15476 16.675 9.48836C16.675 11.8227 16.6663 12.0987 16.6247 13.0201C16.5162 15.369 15.4128 16.495 13.042 16.6028C12.12 16.645 11.8447 16.6538 9.50959 16.6538C7.176 16.6538 6.89923 16.645 5.97788 16.6028C3.60349 16.4943 2.50297 15.3653 2.39518 13.0194C2.35293 12.098 2.34419 11.822 2.34419 9.48763C2.34419 7.15403 2.35366 6.87799 2.39518 5.95591C2.5037 3.60556 3.60713 2.48101 5.97788 2.37321C6.89996 2.3317 7.176 2.32296 9.50959 2.32296Z" fill="white"/>
      </svg>
    ),
    twitter: (
      <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="group-hover:fill-black transition duration-300" d="M0.314206 0.239746L7.00448 9.18539L0.271957 16.4586H1.78718L7.68149 10.0908L12.4439 16.4586H17.6003L10.5336 7.00976L16.8002 0.239746H15.2849L9.85657 6.10435L5.47056 0.239746H0.314206Z" fill="white"/>
      </svg>
    ),
    youtube: (
      <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="group-hover:stroke-black transition duration-300" d="M19.8216 7.57662C19.7226 7.18115 19.521 6.8188 19.2372 6.52618C18.9533 6.23356 18.5973 6.02102 18.205 5.91004C16.7718 5.56006 11.0387 5.56006 11.0387 5.56006C11.0387 5.56006 5.30569 5.56006 3.87244 5.94337C3.48016 6.05435 3.12412 6.26689 2.84028 6.55951C2.55643 6.85213 2.35484 7.21448 2.25585 7.60995C1.99354 9.06451 1.86524 10.5401 1.87254 12.0181C1.86319 13.5072 1.99151 14.994 2.25585 16.4595C2.36498 16.8427 2.57109 17.1912 2.85427 17.4715C3.13746 17.7518 3.48814 17.9543 3.87244 18.0594C5.30569 18.4427 11.0387 18.4427 11.0387 18.4427C11.0387 18.4427 16.7718 18.4427 18.205 18.0594C18.5973 17.9484 18.9533 17.7359 19.2372 17.4433C19.521 17.1506 19.7226 16.7883 19.8216 16.3928C20.0819 14.9492 20.2102 13.4849 20.2049 12.0181C20.2143 10.5289 20.086 9.04213 19.8216 7.57662Z" stroke="white" strokeWidth="1.83333"/>
      </svg>
    ),
    facebook: (
      <svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="group-hover:fill-black transition duration-300" d="M2.86358 5.42686H0.921341V8.01651H2.86358V15.7855H6.10064V8.01651H8.45852L8.6903 5.42686H6.10064V4.34762C6.10064 3.72934 6.22495 3.48462 6.82251 3.48462H8.6903V0.247559H6.22495C3.89685 0.247559 2.86358 1.27241 2.86358 3.23537V5.42686Z" fill="white"/>
      </svg>
    ),
    tiktok: (
      <svg width="19" height="21" viewBox="0 0 19 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="group-hover:fill-black transition duration-300" d="M13.6353 5.12714C13.0332 4.45351 12.7014 3.5884 12.7016 2.69287H9.97985V13.3968C9.95885 13.976 9.70932 14.5247 9.28378 14.9272C8.85825 15.3297 8.28992 15.5547 7.69849 15.5548C6.4477 15.5548 5.40832 14.5535 5.40832 13.3104C5.40832 11.8257 6.8705 10.7122 8.37673 11.1697V8.4419C5.33785 8.04482 2.67773 10.3582 2.67773 13.3104C2.67773 16.185 5.10884 18.2308 7.68968 18.2308C10.4555 18.2308 12.7016 16.0296 12.7016 13.3104V7.8808C13.8053 8.65757 15.1304 9.07433 16.4892 9.07204V6.4047C16.4892 6.4047 14.8332 6.48239 13.6353 5.12714Z" fill="white"/>
      </svg>
    )
  };
  return icons[platform] || null;
};

const Footer = ({
  copyright = "Copyright © 2024 Stevie Awards, Inc. All Rights Reserved. American Business Awards and International Business Awards are registered trademarks of Stevie Awards, Inc.",
  logo = {
    src: "./assets/images/footer-logo.svg",
    alt: "footer logo",
    maxWidth: "311px"
  },
  links = [
    { text: "ABOUT", href: "" },
    { text: "PROGRAMS", href: "" },
    { text: "SPONSORS", href: "" },
    { text: "STORES", href: "" },
    { text: "PRESS", href: "" },
    { text: "CALENDAR", href: "" }
  ],
  socialMedia = [
    { platform: "instagram", href: "" },
    { platform: "twitter", href: "" },
    { platform: "youtube", href: "" },
    { platform: "facebook", href: "" },
    { platform: "tiktok", href: "" }
  ],
  newsletter = {
    title: "SUBSCRIBE TO OUR NEWSLETTER",
    description: "Get free weekly newsletter about opportunities to win Stevie awards",
    buttonText: "SUBSCRIBE",
    placeholder: "EMAIL"
  }
}) => {
  return (
    <footer className="bg-black pt-[162px] pb-9 lg:pb-16 lg:pt-20 overflow-hidden -mt-[120px] lg:mt-0">
      <div className="container">
        <div className="flex flex-wrap lg:flex-nowrap justify-between">
          <div className="w-full lg:max-w-[390px] footer-logo">
            <div className="mb-6">
              <a href="">
                <img 
                  className="max-w-[200px] lg:max-w-[311px] mx-auto text-center lg:text-start lg:mx-0"
                  src={logo.src} 
                  alt={logo.alt}
                />
              </a>
            </div>
            <p className="copyright opacity-30 text-white lg:text-sm text-center lg:text-start text-[11px]">
              {copyright}
            </p>
          </div>
          
          <div className="w-full footer-right-content">
            <ul className="footer-links flex-wrap lg:flex-nowrap justify-center lg:justify-end flex gap-y-3 gap-x-6 lg:gap-9 mb-10 lg:mb-0">
              {links.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-white TuskerGrotesk5500Medium text-xs lg:text-sm leading-4 lg:leading-5">
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
            
            <ul className="footer-socail-media flex flex-wrap justify-center lg:flex-nowrap gap-[22px] lg:justify-end py-8 lg:py-14 border-b border-[#333333] mb-4 lg:mb-0 lg:border-0">
              {socialMedia.map((social, index) => (
                <li key={index}>
                  <a
                    href={social.href}
                    className="w-[33px] h-[33px] hover:bg-primary hover:border-primary rounded-full flex justify-center items-center bg-[#D9D9D914] border border-[#63636380] group"
                  >
                    <SocialIcon platform={social.platform} />
                  </a>
                </li>
              ))}
            </ul>
            
            <div className="subscribe-wrapper max-w-[524px] mx-auto lg:mx-0 lg:ml-auto">
              <div className="mb-4 lg:mb-7">
                <h3 className="text-white TuskerGrotesk5600Semibold text-base lg:text-2xl mb-1 lg:mb-3">
                  {newsletter.title}
                </h3>
                <p className="text-white text-xs lg:text-base opacity-60">
                  {newsletter.description}
                </p>
              </div>
              <form action="">
                <div className="relative">
                  <input
                    className="border box-border w-full h-[44px] lg:h-[54px] outline-0 bg-transparent text-white placeholder:text-[#ffffff60] border-[#ffffff50] TuskerGrotesk5600Semibold pr-[150px] text-sm px-5 focus:border-primary"
                    type="text"
                    placeholder={newsletter.placeholder}
                  />
                  <button
                    type="submit"
                    className="min-w-[130px] absolute top-0 right-0 bottom-0 text-black bg-primary text-sm TuskerGrotesk5600Semibold"
                  >
                    {newsletter.buttonText}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;