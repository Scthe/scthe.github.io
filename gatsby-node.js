const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);
const filterDraftPosts = require(`./src/utils/filterDraftPosts`);

function reportPublishedPosts(reporter, allPosts, posts) {
  if (allPosts.length === posts.length) {
    reporter.info('All blog posts will be visible');
  } else {
    reporter.info(
      `Only ${posts.length} out of ${allPosts.length} will be visible. Rest are drafts`,
    );
  }
}

exports.createPages = async ({ graphql, actions, reporter }) => {
  const mode = process.env.NODE_ENV;
  const includeDrafts = mode !== 'production';
  reporter.info(
    `Build mode=${mode}, will${includeDrafts ? '' : ' not'} include drafts`,
  );

  // Get all markdown blog posts sorted by date
  const result = await graphql(
    `
      {
        allMdx {
          nodes {
            id
            frontmatter {
              permalink
              draft
            }
          }
        }
      }
    `,
  );

  if (result.errors) {
    reporter.panicOnBuild(
      `There was an error loading your blog posts`,
      result.errors,
    );
    return;
  }

  // Define a template for blog post
  const allPosts = result.data.allMdx.nodes;
  const posts = filterDraftPosts(allPosts, includeDrafts);
  reportPublishedPosts(reporter, allPosts, posts);

  // Create blog posts pages
  // But only if there's at least one markdown file found at "content/blog" (defined in gatsby-config.js)
  // `context` is available in the template as a prop and as a variable in GraphQL

  if (posts.length > 0) {
    posts.forEach((post) => {
      actions.createPage({
        path: post.frontmatter.permalink,
        component: path.resolve('./src/templates/blog-post.tsx'),
        context: {
          id: post.id,
        },
      });
    });
  }
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `Mdx`) {
    const value = createFilePath({ node, getNode });

    createNodeField({
      name: `permalink2`,
      node,
      value,
    });
  }
};
