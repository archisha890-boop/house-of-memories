const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const port = 5173;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

http.createServer((request, response) => {
  let route = decodeURIComponent(request.url.split("?")[0]);
  if (route === "/") route = "/index.html";

  const file = path.join(root, route);
  if (!file.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream"
    });
    response.end(data);
  });
}).listen(port, () => {
  console.log(`The House of Memories menu: http://localhost:${port}`);
});
