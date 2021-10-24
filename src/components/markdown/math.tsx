import * as React from 'react';
import TeX from '@matejmazur/react-katex';

const hasClass = (classes: string | string[] = '', clazz: string): boolean =>
  classes.includes(clazz);

export function interceptInlineMath(props) {
  if (hasClass(props.className, 'math-inline')) {
    import('katex/dist/katex.min.css');
    return <TeX math={props.children} />;
  }
  return <span {...props} />;
}

export function interceptBlockMath(props) {
  if (hasClass(props.className, 'math-display')) {
    import('katex/dist/katex.min.css');
    return <TeX block math={props.children} />;
  }
  return <div {...props} />;
}
