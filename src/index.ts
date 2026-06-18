import { config } from 'dotenv';
import {Request, Response} from 'express';
config();
import app from './app';

const PORT = process.env.PORT || 8080 ;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
