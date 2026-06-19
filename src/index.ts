import { config } from 'dotenv';
import { createServer } from './server.ts';

config();

const PORT = Number(process.env.PORT ?? 8080);
const server = createServer();

server.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
