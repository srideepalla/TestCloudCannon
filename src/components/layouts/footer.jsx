import footer from "@data/footer.json";
import { t } from "i18next";

export default function Footer({}) {
  return (
    <footer className="footer pt-8 pb-sm-7 pb-5" id="footer">
      <div className="container-fluid">
        <div className="footer-wrapper">
          <div className="row">
            <div className="col-12 col-lg-4 me-auto order-2 order-lg-1">
              <div className="footer-logo mt-7 mt-md-0 text-center">
                <a href={footer.logo_url} className="d-none d-lg-block">
                  <img src={footer.logo} alt="logo" />
                </a>
                <p>
                  © Copyright <span>{new Date().getFullYear()}</span>{" "}
                  {footer.copyright}
                </p>
              </div>
              <div className="social-icon">
                <ul className="list-unstyled">
                  {footer.social.map((link, i) => (
                    <li key={i}>
                      <a href={`${link.link}`}>
                        <i className={link.social_icon} aria-hidden="true">
                          <span className="visually-hidden">
                            {link.icon_alt}
                          </span>
                        </i>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="col-12 col-lg-6 order-1">
              <div className="d-flex d-lg-none align-items-center justify-content-center">
                <a href={footer.logo_url} className="">
                  <img src={footer.logo} alt="logo" />
                </a>
              </div>
              <div className="footer-widget">
                <ul className="list-unstyled">
                  {footer.sections.map((section, i) => (
                    <li key={i}>
                      <a href={`${section.link}`}>{section.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="footer-form">
                <h2 className="h5">{t("SUBSCRIBE TO OUR NEWSLETTER")}</h2>
                <p className="text-secondary p2">
                  {t(
                    "Get free weekly newsletter about opportunities to win Stevie awards"
                  )}
                </p>
                <form className="">
                  <input
                    type="email"
                    // className="form-control"
                    placeholder="Email"
                  />
                  <button type="submit" className="btn btn-primary">
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
