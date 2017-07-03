const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');

const port = process.env.PORT || 9000;

const clients = [];

// Create a websocket server
const wsServer = createWebsocketServer();

setTimeout(pushRandomMagnetData, 1000);

const protocol = '';
// Accept connections
wsServer.on('request', request => {
	// A new connection was made
	// First we'll check whether the clients accepts our protocol
	// After this we'll add the client to the list
	try {
		const connection = request.accept(protocol, request.origin);
		console.log(`${new Date()} - Connection accepted from ${connection.remoteAddress}`);

		// Save the connection, and set some empty of null values
		const client = {connection : connection, connection_start : new Date(), address : connection.remoteAddress};
		clients.push(client);
		dumpCurrentClients();

		connection.on('message', (message) => {
			if (message.type !== 'utf8') {
				console.log(`${new Date()} - Received non UTF8 message`);
				return;
			}
			console.log(`${new Date()} - Received Message: ${message.utf8Data}`);
			try {
				// Just echo it back
				const parsedMessage = JSON.parse(message.utf8Data);
				connection.sendUTF(JSON.stringify(parsedMessage));
			} catch (Error) {
				connection.sendUTF(JSON.stringify({error : `You can only send JSON strings to ${protocol}`}));
			}
		});
		// Close the connection, remove the connection from the list
		connection.on('close', (reasonCode, description) => {
			console.log(`${new Date()} - Peer ${connection.remoteAddress} will disconnect due to ${reasonCode}`);
			const client = clients.filter(e => e.connection === connection)[0] || undefined;
			if (client === undefined) {
				console.error(`${new Date()} - Client for this connection was not found for some reason!`);
				return;
			}
			clients.splice(clients.indexOf(client, 1));
			dumpCurrentClients();
			console.log(`${new Date()} - Peer ${connection.remoteAddress} disconnected.`);
		});
	} catch (Error) {
		// A client did an invalid request to the ws-server
		console.log(`${new Date()} - A client did an invalid request`);
	}
});

function createWebsocketServer() {
	const server = http.createServer((request, response) => {
		console.log(`${new Date()} Received request for ${request.url}`);
		response.writeHead(404);
		response.end();
	});
	server.listen(port, () => console.log(`${new Date()} - Server is listening on port ${port}`));
	const wsServer = new WebSocketServer({
		httpServer : server,
		autoAcceptConnections : false
	});

	dumpCurrentClients();
	setInterval(dumpCurrentClients, 3 * 1000);
	return wsServer;
}

function dumpCurrentClients() {
	const clientList = clients.map(e => ({since : e.connection_start, ip : e.address}));
	console.log(JSON.stringify({clientList : clientList, clientCount : clientList.length}));
}

function pushRandomMagnetData() {
	const url = randomUrl();
	request(url.url, (error, response, body) => {
		if (!error && response.statusCode === 200) {
			const parsed = JSON.parse(body);
			console.log(`${new Date()} - Got useful data for ${clients.length} clients`);
			clients.forEach(client => client.connection.sendUTF(JSON.stringify({type : url.type, data : parsed})));
		}
		setTimeout(pushRandomMagnetData, Math.ceil(Math.random() * 250 + 100));
	});
}

function randomUrl() {
	const baseUrl = 'https://api.magnet.me';
	if (Math.random() < 0.6) {
		// pull organization
		const id = Math.floor(Math.random() * 1500);
		return {type : 'organization', url : `${baseUrl}/organizations/${id}`};
	} else {
		// pull opportunity
		const id = Math.floor(Math.random() * 20000);
		return {type : 'opportunity', url : `${baseUrl}/opportunities/${id}`};
	}
}

