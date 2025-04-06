//https://addons.mozilla.org/ru/firefox/addon/ignore-x-frame-options/reviews/
//https://gist.github.com/dergachev/e216b25d9a144914eae2  // аналогичный плугин в Chrome
//https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onHeadersReceived

function show_headers(details) {
    let header;
    for (var i = 0; i < details.responseHeaders.length; ++i) {
      name = details.responseHeaders[i].name.toLowerCase();
      if ( name == 'x-frame-options' || name === 'frame-options') {
        details.responseHeaders.splice(i, 1);
        return {
          responseHeaders: details.responseHeaders
        };
//        console.log(details.responseHeaders[i].name.toLowerCase())
      }
    }    
}


browser.webRequest.onHeadersReceived.addListener(
  show_headers,
  {urls: ["<all_urls>"]},
  ["blocking", "responseHeaders"]
);
