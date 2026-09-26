const origin = 'https://hamperiasolutions.com';
const metadata = {
  '': ['Personalised Gift Hampers & Corporate Gifts', 'Explore personalised gift hampers, corporate gifts and hamper-making supplies. Build your own hamper or discover welcome kits and festive gifts with Hamperia.'],
  'corporate-gifting': ['Corporate Gifts for Employees & Clients', 'Discover corporate gifts for employees and clients, from welcome kits to festive hampers. Discuss your quantity, budget and custom branding with Hamperia.'],
  'corporate-diwali-gifts': ['Corporate Diwali Gift Hampers', 'Explore corporate Diwali hampers with dry fruits, chocolates, candles and more. Compare contents and prices for employee and client gifting.'],
  'employee-welcome-kits': ['Employee Welcome Kits & New Joinee Gifts', 'Welcome new employees with Hamperia onboarding kits. Compare Essential, Premium and Signature kits with notebooks, bottles, pens and other useful gifts.'],
  'gift-hampers': ['Gift Hampers for Celebrations & Thank-Yous', 'Explore dry-fruit, chocolate, festive and personalised gift hampers. View each hamper’s contents and price to find a thoughtful gift for your occasion.'],
  'hamperia': ['Build Your Own Hamper & Shop Gift Supplies', 'Choose a box or basket, add gifts and finish with decorations. Build a personalised hamper or buy supplies to assemble your own.']
};
const url = slug => origin + '/' + (slug ? slug + '/' : '');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
function schema(slug, title, description, products, posts, collections) {
  const current = url(slug);
  const graph = [];
  if (!slug) graph.push(
    {'@type':'Organization','@id':origin+'/#organization',name:'Hamperia',alternateName:'Hamperia Solutions',url:current,email:'contact@hamperiasolutions.com'},
    {'@type':'WebSite','@id':origin+'/#website',name:'Hamperia',alternateName:'Hamperia Solutions',url:current,publisher:{'@id':origin+'/#organization'}}
  );
  const product = products.find(p => slug === 'products/'+p.slug);
  const post = posts.find(p => slug === 'blog/'+p.slug);
  if (product) graph.push({'@type':'Product','@id':current+'#product',url:current,name:product.name,description:product.description,image:origin+'/assets/'+product.image,sku:product.slug,brand:{'@type':'Brand',name:'Hamperia'}});
  // Offers are added only when live checkout and current inventory are available.
  if (post) graph.push({'@type':'BlogPosting',headline:post.title,description:post.summary,image:origin+'/assets/'+post.image,mainEntityOfPage:current,author:{'@type':'Organization',name:'Hamperia Solutions',url:origin+'/'},publisher:{'@id':origin+'/#organization'}});
  const collection = collections[slug];
  if (collection || ['hampers','hamperia'].includes(slug)) {
    const items = products.filter(p => collection ? (collection.limit ? p.price < collection.limit : p.tags.includes(slug)) : slug === 'hampers' ? p.category === 'hamper' : !['hamper','kit'].includes(p.category));
    graph.push({'@type':'CollectionPage',url:current,name:title,description,mainEntity:{'@type':'ItemList',itemListElement:items.map((p,i)=>({'@type':'ListItem',position:i+1,url:url('products/'+p.slug),name:p.name}))}});
  }
  if (slug) {
    const crumbs = [{'@type':'ListItem',position:1,name:'Home',item:origin+'/'}];
    if (post) crumbs.push({'@type':'ListItem',position:2,name:'Blog',item:url('blog')});
    else if (product) crumbs.push({'@type':'ListItem',position:2,name:product.category === 'kit' ? 'Employee welcome kits' : product.category === 'hamper' ? 'Personalised hampers' : 'Hamperia Store',item:url(product.category === 'kit' ? 'employee-welcome-kits' : product.category === 'hamper' ? 'hampers' : 'hamperia')});
    else if (collection) crumbs.push({'@type':'ListItem',position:2,name:'Corporate & Bulk Gifting',item:url('corporate-bulk-gifting')});
    crumbs.push({'@type':'ListItem',position:crumbs.length+1,name:title,item:current});
    graph.push({'@type':'BreadcrumbList',itemListElement:crumbs});
  }
  return '<script type="application/ld+json">'+json({'@context':'https://schema.org','@graph':graph})+'</script>';
}
module.exports = { metadata, schema };
