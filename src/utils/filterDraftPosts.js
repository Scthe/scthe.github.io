/**
 * @template { readonly draft: boolean | null } Frontmatter
 * @template { readonly frontmatter: Frontmatter | null } Post
 * @param {readonly Post[]} allPosts
 * @param {boolean} includeDrafts
 * @return {Post[]}
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
