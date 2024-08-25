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
  start() {
    if (!this.serverReady) {
      this.server = http.createServer((request, resource) => {
        if (this.requestListeners.has(request.method)) {
          this.requestListeners.get(request.method).array.forEach(listener => {
            listener(request, resource);
          });
        }
      })
      this.server.listen(this.port, this.hostname,
        () => console.log(`Server is running on http://${this.hostname}:${this.port}`));
      this.serverReady = true;
    }
  }
  stop() {
    this.server.close();
    this.serverReady = false;
    console.log(`HTTP Server is no longer running`);
  }
  addEventListener(requestType, listener) {
    this.requestListeners.set(requestType, listener);
  }
}

module.exports = { SimpleHTTPServer };
