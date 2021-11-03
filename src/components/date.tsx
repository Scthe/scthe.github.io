import * as React from 'react';
import { dateFmt, dateToXmlSchema } from '../utils';

interface Props {
  date: Date;
  className?: string;
}

const Date: React.FC<Props> = ({ className, date }) => {
  return (
    <time className={className} dateTime={dateToXmlSchema(date)}>
      {dateFmt(date)}
    </time>
  );
};

export default Date;
