/**
 * @typedef {Object} Links
 * @prop {string} github Your github repository
 */

/**
 * @typedef {Object} MetaConfig
 * @prop {string} title Your website title
 * @prop {string} description Your website description
 * @prop {string} author Maybe your name
 * @prop {string} siteUrl Your website URL
 * @prop {string} lang Your website Language
 * @prop {string} utterances Github repository to store comments
 * @prop {string} commentRepo Github repository to store comments
 * @prop {string} commentRepoId Github repository to store comments
 * @prop {string} commentCategoryId Github repository to store comments
 * @prop {Links} links
 * @prop {string} favicon Favicon Path
 */

/** @type {MetaConfig} */
const metaConfig = {
  title: "Dev Woochan",
  description: `임우찬 개발블로그`,
  author: "Woochan Lim",
  siteUrl: "https://blog.woochan.info",
  lang: "en",
  utterances: "dladncks1217/blog",
  links: {
    github: "https://github.com/dladncks1217",
  },
  favicon: "src/images/icon.png",
  commentRepo: "dladncks1217/blog",
  commentRepoId: "R_kgDOLUpoFQ",
  commentCategoryId: "DIC_kwDOLUpoFc4CdZbA",
}

// eslint-disable-next-line no-undef
module.exports = metaConfig
