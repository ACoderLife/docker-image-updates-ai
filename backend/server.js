const fs = require("fs");
const http = require("http");
const process = require("process");
const express = require("express");
const app = express();

// GET /hello endpoint
app.get("/hello", function (req, res) {
    res.send({ message: "Hello" });
});

// Start the server

const sock = process.argv[2];

fs.stat(sock, function (err) {
    if (!err) {
        fs.unlinkSync(sock);
    }

    http.createServer(app).listen(sock, function () {
        fs.chmodSync(sock, "777");
        console.log("Express server listening on " + sock);
    });
});
