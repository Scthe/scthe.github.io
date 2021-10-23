import * as React from 'react';
import TeX from '@matejmazur/react-katex';

export function interceptInlineMath(props) {
  if (props.className.includes('math-inline')) {
    import('katex/dist/katex.min.css');
    return <TeX math={props.children} />;
  }

  return <span {...props} />;
}

export function interceptBlockMath(props) {
  if (props.className.includes('math-display')) {
    import('katex/dist/katex.min.css');
    return <TeX block math={props.children} />;
  }

  return <div {...props} />;
}