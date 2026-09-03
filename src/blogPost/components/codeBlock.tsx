import { Highlight } from 'prism-react-renderer';
import React from 'react';
import cx from 'classnames';

import { useMode } from '../../hooks/useMode';
import * as styles from './codeblock.module.scss';
import theme from './codeBlock.theme';

// TODO [P5] <figure>, <figcaption>
// TODO [P5] small hint about language in top right (with border radius), hides on code hover
// TODO [Migration] Character escape, see code in http://localhost:8080/blog/rag-with-context/

export const CodeBlockWrapper: React.FC = (props) => <div {...props} />;

type Props = React.PropsWithChildren<{
  className?: string;
  /** `language-*` class preserved via rehypePreserveCodeLanguage (survives @astrojs/react). */
  'data-language'?: string;
}>;

/** Inline code is a single line and carries no `language-*` class. */
const isInlineCode = (code: string, language: string) =>
  !code.includes('\n') && language === '';

const CodeBlock: React.FC<Props> = ({ className, children, ...rest }) => {
  const mode = useMode();

  const dataLanguage = rest['data-language'];
  const language =
    (dataLanguage && String(dataLanguage)) ||
    (className ?? '').replace(/language-/, '') ||
    '';

  const code = toCodeString(children);

  if (isInlineCode(code, language)) {
    return <code>{code}</code>;
  }

  if (language === '' && mode === 'development') {
    console.warn('Unknown language for:', code);
  }

  return (
    <Highlight code={code} language={language} theme={theme}>
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

/** Flatten whatever Astro's MDX runtime hands us (string/array/nodes) into plain code text. */
function toCodeString(node: React.ReactNode): string {
  if (typeof node === 'string') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((c) => toCodeString(c)).join('');
  }
  if (node != null && typeof node === 'object' && 'props' in node) {
    return toCodeString(node.props.children ?? node.props.value);
  }

  return '' + node;
}
