const http = require('http');
const DEFAULT_HTTP_PORT = 8123;
const HOSTNAME = 'localhost';

class SimpleHTTPServer {
  requestListeners = new Map();
  constructor(port = DEFAULT_HTTP_PORT, hostname = HOSTNAME) {
    this.port = port;
    this.hostname = hostname;
    this.serverReady = false;
  }
  start(whenReady) {
    if (!this.serverReady) {
      this.server = http.createServer((request, response) => {
        if (this.requestListeners.has(request.method)) {
          this.requestListeners.get(request.method).forEach(listener => {
            listener(request, response);
          });
        }
      })
      this.server.listen(this.port, this.hostname,
        () => console.log(`Server is running on http://${this.hostname}:${this.port}`));
        whenReady();
      this.serverReady = true;
    }
  }
  stop() {
    this.server.close();
    this.serverReady = false;
    console.log(`HTTP Server is no longer running`);
  }
  addEventListener(requestType, listener) {
    if (this.requestListeners.has(requestType)) {
      this.requestListeners.get(requestType).push(listener);
      return;
    }
    this.requestListeners.set(requestType, new Array());
    this.requestListeners.get(requestType).push(listener);
  }
}

module.exports = { SimpleHTTPServer };
