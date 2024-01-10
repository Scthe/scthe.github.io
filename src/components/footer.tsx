import * as React from 'react';

import * as styles from './footer.module.scss';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div>Thanks for reading!</div>
      <div className={styles.footerCopyright}>
        Content and illustrations © 2024 Marcin Matuszczyk. All Rights
        Reserved.
      </div>
    </footer>
  );
};

export default Footer;
