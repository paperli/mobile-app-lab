if (new URLSearchParams(location.search).has('phone')) import('./phone-client.js');
else import('./main.js');
