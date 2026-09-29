import React from 'react';
import Header from '../common/Header';

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex flex-col relative w-full">

      {/* Global Background Blobs */}
      <div className="blob" style={{ top: '10%', left: '10%' }}></div>
      <div className="blob" style={{ bottom: '20%', right: '10%', background: 'var(--secondary)' }}></div>
      
      <Header />
      
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>

      <footer className="py-8 px-6 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        © 2026 Cambridge Learning Services • Secure Examination Environment
      </footer>
    </div>
  );
};

export default DashboardLayout;
