/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as React from 'react';
import TeX from '@matejmazur/react-katex';

const hasClass = (classes: string | string[] = '', clazz: string): boolean =>
  classes.includes(clazz);

type MaybeMathElementProps = any;

export function interceptInlineMath(props: MaybeMathElementProps) {
  if (hasClass(props.className, 'math-inline')) {
    // @ts-ignore
    import('katex/dist/katex.min.css');
    return <TeX math={props.children} />;
  }
  return <span {...props} />;
}

export function interceptBlockMath(props: MaybeMathElementProps) {
  if (hasClass(props.className, 'math-display')) {
    // @ts-ignore
    import('katex/dist/katex.min.css');
    return <TeX block math={props.children} />;
  }
  return <div {...props} />;
}
