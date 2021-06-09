const child_process = require("child_process");
const fs = require("fs");
const http = require("http");
const chokidar = require("chokidar");

let waitingClient = null;

const requestListener = function (request, response) {
    if (request.method === "POST" && request.url === "/rungbs") {
        let body = [];
        request.on("data", (chunk) => {
            body.push(chunk);
        }).on("end", () => {
            const gbsprojPath = "./projects/Example/gbexample.gbsproj";
            
            console.log("got request, writing JSON...");
            waitingClient = response;
            body = Buffer.concat(body).toString();
            fs.writeFileSync(gbsprojPath, body);

            console.log("launching GB Studio...");
            const gbstudioProcess = child_process.spawn("compile_rom.bat", [gbsprojPath, "Example"]);
            gbstudioProcess.stdout.on("data", data => { console.log(data.toString()) });
            gbstudioProcess.stderr.on("data", data => { console.log(data.toString()) });
        });          
    }
    else {
        console.log("bad request, ignoring!");
        response.statusCode = 404;
        response.write("bad endpoint, try POST to /rungbs");
        response.end();
    }
}


const romPath = "./projects/Example/build/rom/game.gb";
const watcher = chokidar.watch(romPath, {
    ignoreInitial: true,
    persistent: true
});
watcher.on("add", (path, stats) => {
    console.log("ROM generated at path", path);
    if (!waitingResponse) return;
    const romContents = fs.readFileSync(romPath).toString();
    waitingResponse.write(romContents);
    waitingResponse.statusCode = 200;
    waitingResponse.end();
    //fs.unlinkSync(romPath); // remove ROM so subsequent runs create the file afresh and trigger our watcher
});

const server = http.createServer(requestListener);
server.listen(8081);
console.log("server listening on port 8081!");
