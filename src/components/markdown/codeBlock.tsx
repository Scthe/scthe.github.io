import Highlight, { defaultProps } from 'prism-react-renderer';
import React from 'react';
import cx from 'classnames';

import * as styles from './codeblock.module.scss';
import theme from './codeBlock.theme';

// TODO <figure>, <figcaption>
// TODO small hint about language in top right (with border radius), hides on code hover

export const CodeBlockWrapper: React.FC = (props) => (
  <div {...props} />
);

interface Props {
  className: string;
}

const CodeBlock: React.FC<Props> = ({ className, children }) => {
  const language = className.replace(/language-/, '') || '';
  return (
    <Highlight
      {...defaultProps}
      code={children as any}
      language={language as any}
      theme={theme}
    >
      {({ className, tokens, getLineProps, getTokenProps }) => (
        <pre className={cx(className, styles.highlight)}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};

export default CodeBlock;
