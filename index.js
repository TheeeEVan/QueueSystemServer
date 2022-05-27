import { PeerServer } from 'peer'


// this function returns a string that will be used for ids
const customGenerationFunction = () => (Math.random().toString()).substr(2, 5);

const peerServer = PeerServer({ port: (process.env.PORT || 3000), generateClientId: customGenerationFunction, allow_discovery: true });

