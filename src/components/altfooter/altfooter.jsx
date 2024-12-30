import React from "react";

function Altfooter(block) {
  return (
    <footer className="bg-black pt-[162px] pb-9 lg:pb-16 lg:pt-20 overflow-hidden -mt-[120px] lg:mt-0">
      <div className="container">
        <div className="flex flex-wrap lg:flex-nowrap justify-between">
          <div className="w-full lg:max-w-[390px] footer-logo">
            <div className="mb-6">
              <a href="">
                <img
                  className="max-w-[200px] lg:max-w-[311px] mx-auto text-center lg:text-start lg:mx-0"
                  src={block.logo.src}
                  alt={block.logo.alt}
                />
              </a>
            </div>
            <p className="copyright opacity-30 text-white lg:text-sm text-center lg:text-start text-[11px]">
              {block.copyright}
            </p>
          </div>

          <div className="w-full footer-right-content">
            <ul className="footer-links flex-wrap lg:flex-nowrap justify-center lg:justify-end flex gap-y-3 gap-x-6 lg:gap-9 mb-10 lg:mb-0">
              {block.links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-white TuskerGrotesk5500Medium text-xs lg:text-sm leading-4 lg:leading-5"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>

            <ul className="footer-socail-media flex flex-wrap justify-center lg:flex-nowrap gap-[22px] lg:justify-end py-8 lg:py-14 border-b border-[#333333] mb-4 lg:mb-0 lg:border-0">
              {block.socialMedia.map((social, index) => (
                <li key={index}>
                  <a
                    href={social.href}
                    className="w-[33px] h-[33px] hover:bg-primary hover:border-primary rounded-full flex justify-center items-center bg-[#D9D9D914] border border-[#63636380] group"
                  >
                    {social.platform}
                  </a>
                </li>
              ))}
            </ul>

            <div className="subscribe-wrapper max-w-[524px] mx-auto lg:mx-0 lg:ml-auto">
              <div className="mb-4 lg:mb-7">
                <h3 className="text-white TuskerGrotesk5600Semibold text-base lg:text-2xl mb-1 lg:mb-3">
                  {block.newsletter.title}
                </h3>
                <p className="text-white text-xs lg:text-base opacity-60">
                  {block.newsletter.description}
                </p>
              </div>
              <form action="">
                <div className="relative">
                  <input
                    className="border box-border w-full h-[44px] lg:h-[54px] outline-0 bg-transparent text-white placeholder:text-[#ffffff60] border-[#ffffff50] TuskerGrotesk5600Semibold pr-[150px] text-sm px-5 focus:border-primary"
                    type="text"
                    placeholder="EMAIL"
                  />
                  <button
                    type="submit"
                    className="min-w-[130px] absolute top-0 right-0 bottom-0 text-black bg-primary text-sm TuskerGrotesk5600Semibold"
                  >
                    SUBSCRIBE
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Altfooter;
