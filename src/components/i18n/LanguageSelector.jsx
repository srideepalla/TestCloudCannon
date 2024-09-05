import { useEffect, useState } from "react";

export default function LanguageSelector() {
  const [lang, setLang] = useState("en");
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
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
  return (
    <select
      onChange={handleLanguageChange}
      style={{ width: 80, height: 40 }}
      className="bg-transparent border-1 text-white"
      value={lang}
    >
      <option value="en">🇱🇷 ENG</option>
      <option value="es">🇪🇸 ESP</option>
    </select>
  );
}
