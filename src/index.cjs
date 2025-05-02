const { createServer } = require("node:http");
const { hostname } = require("node:os");
const wisp = require("wisp-server-node");
const Fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const path = require("path");
const { exec } = require("child_process");

// static paths
const publicPath = path.join(__dirname, "../Ultraviolet-Static/public");
const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				// Forward headers as-is
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) {
					wisp.routeRequest(req, socket, head);
				} else {
					socket.end();
				}
			});
	},
});

fastify.addHook("onRequest", (req, res, done) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Cookie");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    done();
});

fastify.register(fastifyStatic, {
	root: path.join(publicPath),
	decorateReply: true,
});

fastify.get("/uv/uv.config.js", (req, res) => {
	return res.sendFile("uv/uv.config.js", publicPath);
});

fastify.register(fastifyStatic, {
	root: uvPath,
	prefix: "/uv/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: epoxyPath,
	prefix: "/epoxy/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.register(require("@fastify/cors"), {
    origin: true, // Allow all origins or specify your domain
    credentials: true,
});

// Webhook route
fastify.post("/webhook", async (req, res) => {
    const event = req.headers["x-github-event"];
    const id = req.headers["x-github-delivery"];

    if (!event || !id) {
        res.status(400).send("Missing required headers");
        return;
    }

    const body = req.body;

    if (event === "push") {
        console.log(`Received push event for repository: ${body.repository.full_name}`);
        console.log(`Pushed by: ${body.pusher.name}`);
        console.log(`Commit message: ${body.head_commit.message}`);

        // Run git pull
        exec("git pull", { cwd: "c:\\Users\\zhank\\Documents\\Orange army\\orange-proxy" }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing git pull: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`git pull stderr: ${stderr}`);
            }
            console.log(`git pull stdout: ${stdout}`);

            // Restart the application using PM2
            exec("pm2 restart orange-proxy", (pm2Error, pm2Stdout, pm2Stderr) => {
                if (pm2Error) {
                    console.error(`Error restarting application with PM2: ${pm2Error.message}`);
                    return;
                }
                if (pm2Stderr) {
                    console.error(`PM2 restart stderr: ${pm2Stderr}`);
                }
                console.log(`PM2 restart stdout: ${pm2Stdout}`);
            });
        });
    }

    res.status(200).send("Webhook received");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = 3000;

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});
