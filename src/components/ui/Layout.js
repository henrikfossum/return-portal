// src/components/ui/Layout.js
import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      {/* Add header, footer, or other common elements here */}
      {children}
    </div>
  );
};

export default Layout;
