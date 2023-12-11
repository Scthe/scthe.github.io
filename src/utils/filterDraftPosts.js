/**
 * @template { readonly draft: boolean | null } Frontmatter
 * @param {readonly { readonly frontmatter: Frontmatter | null }[]} allPosts
 * @param {boolean} includeDrafts
 * @return {T[]}
 */
function filterDraftPosts(allPosts, includeDrafts) {
  return allPosts.filter((e) => {
    if (e == null) {
      return false;
    }
    const isFinishedArticle = e.frontmatter?.draft === false;
    return isFinishedArticle || includeDrafts;
  });
}

module.exports = filterDraftPosts;
