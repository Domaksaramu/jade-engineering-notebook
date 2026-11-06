import { escape as e } from './content.mjs';

export function seoTags({title,description,canonical,image,imageAlt,article=false,publishedAt,updatedAt,author='임재원'}) {
  if(!canonical)return '';
  const meta=(key,value)=>`<meta property="${key}" content="${e(value)}">`;
  const tags=[`<link rel="canonical" href="${e(canonical)}">`,meta('og:url',canonical),meta('og:site_name','임재원 · Engineering Notebook')];
  tags.push(`<meta name="twitter:card" content="${image?'summary_large_image':'summary'}">`);
  if(image)tags.push(meta('og:image',image),meta('og:image:type','image/png'),meta('og:image:width','1200'),meta('og:image:height','630'),meta('og:image:alt',imageAlt),`<meta name="twitter:image" content="${e(image)}">`,`<meta name="twitter:image:alt" content="${e(imageAlt)}">`);
  if(article) {
    if(publishedAt)tags.push(meta('article:published_time',publishedAt));
    if(updatedAt)tags.push(meta('article:modified_time',updatedAt));
    const data={'@context':'https://schema.org','@type':'BlogPosting',headline:title,description,inLanguage:'ko',mainEntityOfPage:canonical,author:{'@type':'Person',name:author},...(image?{image:[image]}:{}),...(publishedAt?{datePublished:publishedAt}:{}),...(updatedAt?{dateModified:updatedAt}:{})};
    tags.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`);
  }
  return tags.join('\n');
}
