import { PeerServer } from 'peer'
import ip from 'public-ip';

console.log(await ip.v4() + ":" + (process.env.PORT || 3000));


// this function returns a string that will be used for ids
const customGenerationFunction = () => (Math.random().toString(36)).substr(2, 5);

const peerServer = PeerServer({ port: 3000, path: '/queue', generateClientId: customGenerationFunction });

