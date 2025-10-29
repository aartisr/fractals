const staticPaths = new Set(["/_headers","/_redirects","/apple-touch-icon-180x180.png","/favicon.ico","/favicon.svg","/fonts/poppins-400.woff2","/fonts/poppins-500.woff2","/fonts/poppins-700.woff2","/images/gallery/image1.jpg","/images/gallery/image10.jpg","/images/gallery/image11.jpg","/images/gallery/image12.png","/images/gallery/image13.jpg","/images/gallery/image14.jpg","/images/gallery/image2.jpg","/images/gallery/image3.jpg","/images/gallery/image4.jpg","/images/gallery/image5.jpg","/images/gallery/image6.jpg","/images/gallery/image7.jpg","/images/gallery/image8.jpg","/images/gallery/image9.jpg","/images/merida-mountains.svg","/images/moa-logo.svg","/logo.svg","/manifest.json","/maskable-icon-512x512.png","/pwa-192x192.png","/pwa-512x512.png","/pwa-64x64.png","/q-manifest.json","/qwik-prefetch-service-worker.js","/robots.txt","/service-worker.js","/sitemap.xml"]);
function isStaticPath(method, url) {
  if (method.toUpperCase() !== 'GET') {
    return false;
  }
  const p = url.pathname;
  if (p.startsWith("/build/")) {
    return true;
  }
  if (p.startsWith("/assets/")) {
    return true;
  }
  if (staticPaths.has(p)) {
    return true;
  }
  if (p.endsWith('/q-data.json')) {
    const pWithoutQdata = p.replace(/\/q-data.json$/, '');
    if (staticPaths.has(pWithoutQdata + '/')) {
      return true;
    }
    if (staticPaths.has(pWithoutQdata)) {
      return true;
    }
  }
  return false;
}
export { isStaticPath };