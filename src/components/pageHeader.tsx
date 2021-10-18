import React, { FC } from 'react';
import * as styles from "./pageHeader.module.css"

const PageHeader: FC = () => {
  // TODO useStaticQuery()
  return <h1 style={{ color: "red" }} className={styles.container}>Page header!</h1>;
};

export default PageHeader;