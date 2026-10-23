import './landing.css';
import { hubUrl } from './hub-link.js';

// Preserve existing QR codes and review deep links after adding the gallery.
const params = new URLSearchParams(location.search);
if (['scene', 'phone', 'mobile', 'flow', 'clean', 'renderer', 'quality'].some(key => params.has(key))) {
  location.replace(`play.html${location.search}${location.hash}`);
}
document.getElementById('galleryHub').href = hubUrl();
