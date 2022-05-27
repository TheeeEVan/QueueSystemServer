import { PeerServer } from 'peer'


// this function returns a string that will be used for ids
const customGenerationFunction = () => (Math.random().toString(36)).substr(2, 5);

const peerServer = PeerServer({ port: (process.env.PORT || 3000), generateClientId: customGenerationFunction });

