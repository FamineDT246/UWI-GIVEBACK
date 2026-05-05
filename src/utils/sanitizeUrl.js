export function sanitizeUrl(url) {
  if (!url) return '#';
  
  try {
    // If it's a relative path or missing a protocol, URL() will parse it against a dummy base
    // If it's an absolute path, it parses normally
    const parsedUrl = new URL(url, 'https://dummybase.com');
    
    // Only allow safe, standard web and email protocols
    if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
      if (url.startsWith('www.')) {
        return `https://${url}`;
      }
      return url;
    }
    
    // If it's an executable script protocol, neutralize it
    return '#';
  } catch (error) {
    // If the URL is completely malformed, neutralize it
    return '#';
  }
}