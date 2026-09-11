import api from '../api/axios';

// GETs a binary response through the authenticated axios instance (a plain
// <a href> can't carry the Authorization header) and triggers a browser
// download for it.
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
