import { createApp } from './app.js';
import { env } from './config/env.js';
const app = createApp();
app.listen(env.PORT, () => {
    console.log(`Clinexa backend listening on port ${env.PORT}`);
});
