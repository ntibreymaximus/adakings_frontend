import React from 'react';
import packageJson from '../../package.json';

const Footer = () => {
  return (
    <div className="app-footer">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 text-center">
            <div className="footer-content">
              <div className="copyright">© 2025 ADARESMANSYS. All rights reserved.</div>
              <div className="version">v{packageJson.version}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
