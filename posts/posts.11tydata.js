module.exports = {
  eleventyComputed: {
      permalink: data => {
          if(data.draft) return false;
      },
      tags: data => {
          if(!data.draft) {
            data.tags.push('posts');
            return data.tags;
          }
          return [];
      }
  }
}