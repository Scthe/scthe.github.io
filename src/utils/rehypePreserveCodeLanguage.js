/**
 * Copies the `language-*` class from a fenced-code `<code>` element onto a
 * `data-language` attribute.
 *
 * `@astrojs/react` deletes `props.class` before React components run, so the
 * MDX `code` component override can never see the language in `className`.
 * A `data-*` attribute survives the React bridge, so the <CodeBlock>
 * component reads it from there.
 */
const rehypePreserveCodeLanguage = () => (root) => {
  const visitNode = (node) => {
    if (Array.isArray(node?.children)) {
      for (const child of node.children) {
        visitNode(child);
      }
    }
    if (node?.type !== 'element' || node?.tagName !== 'code') {
      return;
    }
    const className = node.properties?.className;
    const classNames = Array.isArray(className) ? className : [];
    const lang = classNames.find((c) => String(c).startsWith('language-'));
    if (lang != null) {
      node.properties['data-language'] = String(lang).slice('language-'.length);
    }
  };

  visitNode(root);
};

export default rehypePreserveCodeLanguage;
