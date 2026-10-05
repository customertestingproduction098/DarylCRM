import React from 'react';

export default function Footer() {
  return (
    <footer className="py-4 px-6 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
      &copy; {new Date().getFullYear()} Daryl's Glass Repair & Windshield Replacement Service. All rights reserved.
    </footer>
  );
}
