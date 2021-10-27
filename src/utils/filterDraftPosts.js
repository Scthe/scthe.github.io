/**
 * @template {readonly {readonly frontmatter?: {draft?: boolean} }} T
 * @param {readonly T[]} allPosts
 * @param {boolean} includeDrafts
 * @return {T[]}
 */
function filterDraftPosts(allPosts, includeDrafts) {
  if (!includeDrafts) {
    allPosts = allPosts.filter((e) => {
      const isFinishedArticle = e.frontmatter?.draft === false;
      return isFinishedArticle;
    });
  }
  return allPosts;
}

module.exports = filterDraftPosts;
