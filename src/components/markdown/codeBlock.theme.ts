import { PrismTheme } from 'prism-react-renderer';

// Based on theme from https://prismjs.com/

const theme: PrismTheme = {
  plain: {
    color: '#403f53',
    backgroundColor: '#FBFBFB',
  },
  styles: [
    {
      types: ['changed', 'punctuation'],
      style: {
        color: 'rgb(162, 191, 252)',
      },
    },
    {
      types: [
        'property',
        'tag',
        'boolean',
        'number',
        'constant',
        'symbol',
        'deleted',
      ],
      style: {
        color: 'rgba(239, 83, 80, 0.56)',
      },
    },
    {
      types: [
        'inserted',
        'token.selector',
        'attr-name',
        'string',
        'char',
        'builtin',
        'inserted',
      ],
      style: {
        color: '#690',
      },
    },
    {
      types: ['comment'],
      style: {
        color: 'slategray',
      },
    },
    {
      types: ['string', 'builtin', 'char', 'constant', 'url'],
      style: {
        color: 'rgb(72, 118, 214)',
      },
    },
    {
      types: ['variable', 'regex', 'important'],
      style: {
        color: '#e90',
      },
    },
    {
      types: ['number'],
      style: {
        color: 'rgb(170, 9, 130)',
      },
    },
    {
      // This was manually added after the auto-generation
      // so that punctuations are not italicised
      types: ['punctuation'],
      style: {
        color: 'rgb(153, 76, 195)',
      },
    },
    {
      types: ['function', 'selector', 'doctype', 'class-name'],
      style: {
        color: '#dd4a68',
      },
    },
    {
      types: ['class-name'],
      style: {
        color: 'rgb(17, 17, 17)',
      },
    },
    {
      types: ['tag'],
      style: {
        color: 'rgb(153, 76, 195)',
      },
    },
    {
      types: ['operator', 'entity', 'url', 'property'],
      style: {
        color: '#9a6e3a',
      },
    },
    {
      types: ['keyword', 'namespace', 'attr-value'],
      style: {
        color: '#07a',
      },
    },
    {
      types: ['boolean'],
      style: {
        color: 'rgb(188, 84, 84)',
      },
    },
  ],
};

export default theme;
