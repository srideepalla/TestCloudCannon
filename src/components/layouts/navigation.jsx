import { useEffect, useState } from "react";
import navigation from "@data/navigation.json";

export default function Navigation({ pageUrl }) {
  const [isSticky, setSticky] = useState(false);
  const [lang, setLang] = useState("en");

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    const currentPath = window.location.pathname;

    // Strip existing language prefix if present
    const newPath =
      currentPath.startsWith("/en/") || currentPath.startsWith("/es/")
        ? currentPath.substring(currentPath.indexOf("/", 1))
        : currentPath;

    // Prepend new language prefix if != English
    const updatedPath = newLang === "en" ? newPath : `/${newLang}${newPath}`;

    // Navigate to the new path
    window.location.href = updatedPath;
  };
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/es/")) {
      setLang("es");
    } else {
      setLang("en");
    }
  }, []);

  const handleScroll = () => {
    setSticky(window.scrollY >= 70);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleClick = (event) => {
    const navbar = $("#mainnavigationBar");
    navbar.toggleClass("bg-nav");
  };

  const handleDropdownClick = (e) => {
    if (window.innerWidth >= 991.98) return;

    e.preventDefault();

    const parentDropdown = e.target.closest(".dropdown");
    if (!parentDropdown) return;

    const wasOpen = parentDropdown.classList.contains("show");

    document
      .querySelectorAll(".dropdown.show, .dropdown-menu.show")
      .forEach((el) => el.classList.remove("show"));

    if (!wasOpen) {
      parentDropdown.classList.add("show");
      parentDropdown.querySelector(".dropdown-menu").classList.add("show");
    }
  };

  return (
    <>
      <header>
        <nav
          className={`navbar navbar-expand-lg position-fixed w-100 zindex-dropdown${
            isSticky ? " sticky-nav" : ""
          }`}
          id="mainnavigationBar"
        >
          <div className="container-fluid">
            <a className="navbar-brand" href="/">
              <img src={navigation.logo} alt="Nav-Logo" />
              <img src={navigation.logo2} alt="Nav-Logo" />
            </a>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
              onClick={handleClick}
            >
              <span className="navbar-toggler-default">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line
                    x1="3.5"
                    y1="5.5"
                    x2="21.5"
                    y2="5.5"
                    stroke="#292D32"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="4.5"
                    y1="12.5"
                    x2="21.5"
                    y2="12.5"
                    stroke="#292D32"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="11.5"
                    y1="19.5"
                    x2="21.5"
                    y2="19.5"
                    stroke="#292D32"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="navbar-toggler-toggled">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21.5 6.5L6.5 21.5"
                    stroke="#404152"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21.5 21.5L6.5 6.5"
                    stroke="#404152"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <div
              className="collapse navbar-collapse"
              id="navbarSupportedContent"
            >
              <ul className="navbar-nav mx-auto mb-20 mb-lg-0">
                {navigation.items.map((item, i) => (
                  <li
                    key={i}
                    className={`nav-item ${
                      item.enable_dropdown && item.dropdown ? "dropdown" : ""
                    }`}
                  >
                    {item.enable_dropdown && item.dropdown ? (
                      <>
                        <a
                          href={`${item.link}`}
                          className={`nav-link dropdown-link ${
                            pageUrl?.pathname === item.link ? "active" : ""
                          }`}
                          onClick={handleDropdownClick}
                        >
                          {item.text}
                        </a>
                        <ul className="dropdown-menu">
                          {item.dropdown.map((dropdown_item, j) => (
                            <li key={j}>
                              <a
                                className="dropdown-item"
                                href={dropdown_item.dropdown_link}
                              >
                                {dropdown_item.dropdown_text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <a
                        href={`${item.link}`}
                        className={`nav-link ${
                          pageUrl?.pathname === item.link ? "active" : ""
                        }`}
                      >
                        {item.text}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <div className="search">
                {/* <input type="text" placeholder="Search..." className="search-input" /> */}
                <button
                  className="text-primary bg-transparent border-1"
                  style={{
                    width: 40,
                    height: 40,
                    marginLeft: "auto",
                    marginRight: 4,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.25 14.2422C11.5637 14.2422 14.25 11.5559 14.25 8.24219C14.25 4.92848 11.5637 2.24219 8.25 2.24219C4.93629 2.24219 2.25 4.92848 2.25 8.24219C2.25 11.5559 4.93629 14.2422 8.25 14.2422Z"
                      stroke="white"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.7469 15.7391L12.4844 12.4766"
                      stroke="white"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <select
                onChange={handleLanguageChange}
                style={{ width: 80, height: 40 }}
                className="bg-transparent border-1 text-white"
                value={lang}
              >
                <option value="en">🇱🇷 ENG</option>
                <option value="es">🇪🇸 ESP</option>
              </select>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
