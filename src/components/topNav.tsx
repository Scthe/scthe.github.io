import * as React from 'react';
import { Link, useStaticQuery, graphql } from 'gatsby';
import { toggleThemeFn } from '../utils/themeToggleScript';
import * as styles from './topNav.module.scss';

const TopNav: React.FC = () => {
  const { site } = useStaticQuery<GatsbyTypes.TopNavQuery>(
    graphql`
      query TopNav {
        site {
          siteMetadata {
            title
            author {
              githubAccount
            }
          }
        }
      }
    `,
  );
  const title = site!.siteMetadata!.title;
  const githubAccount = site!.siteMetadata!.author!.githubAccount;

  return (
    <header className={styles.topNav}>
      <ul className={styles.topNavContent}>
        <li className={styles.topNavHome}>
          <Link to="/" aria-label="Scthe's blog - home">
            {title}
          </Link>
        </li>

        <li>
          <button
            id="theme-toggle"
            className={styles.topNavThemeToggle}
            aria-label="Toggle light/dark theme"
            onClick={toggleThemeFn}
          >
            <svg
              viewBox="0 0 24 24"
              width="32"
              height="32"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <g className={styles.toggleSun}>
                <g transform="translate(4 4)">
                  <rect width="16" height="16" />
                </g>
                <g transform="translate(12 1) rotate(45 0 0)">
                  <rect width="16" height="16" />
                </g>
              </g>

              <circle cx="12" cy="12" r="7" />
              <circle className={styles.toggleCircle} cx="12" cy="12" r="6" />
            </svg>
          </button>
        </li>

        <li>
          <a
            href={githubAccount}
            className={styles.topNavGithubLink}
            target="_blank"
            rel="noopener noreferrer external"
            aria-label="My GitHub"
          >
            <svg
              className="top_nav-github_icon"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </li>
      </ul>
    </header>
  );
};

export default TopNav;
