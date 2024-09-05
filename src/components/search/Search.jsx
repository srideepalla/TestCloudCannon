import { useState } from "react";

export default function Search() {
  const [open, setOpen] = useState(false);
  return (
    <div className="search">
      {/* <input type="text" placeholder="Search..." className="search-input" /> */}
      <button
        className="text-primary bg-transparent border-1"
        style={{ width: 40, height: 40, marginLeft: "auto", marginRight: 4 }}
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
  );
}
