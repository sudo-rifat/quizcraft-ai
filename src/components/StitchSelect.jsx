import React, { useState, useRef, useEffect } from 'react';

export default function StitchSelect({ value, onChange, options, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue) => {
    // Mimic the native event object so existing onChange handlers work without modification
    onChange({ target: { value: String(optionValue) } });
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => {
    const optValue = typeof opt === 'object' ? opt.value : opt;
    return String(optValue) === String(value);
  });
  
  const displayLabel = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) 
    : 'Select...';

  // Extract base classes like height and padding if provided, else use defaults
  const containerClasses = className || "w-full h-10 px-3 text-xs";

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`${containerClasses} rounded-xl flex items-center justify-between bg-surface-container-lowest border transition-all cursor-pointer select-none font-body text-on-surface
          ${isOpen ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-outline-variant hover:border-outline/80'}`}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <svg 
          className={`w-4 h-4 text-outline transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 origin-top">
          <ul className="py-1">
            {options.map((opt, idx) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              const isSelected = String(value) === String(optValue);

              return (
                <li
                  key={idx}
                  onClick={() => handleSelect(optValue)}
                  className={`px-3.5 py-2.5 text-xs font-body cursor-pointer flex items-center justify-between transition-colors
                    ${isSelected 
                      ? 'bg-primary/10 text-primary font-semibold' 
                      : 'text-on-surface hover:bg-surface-container-low'}`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
