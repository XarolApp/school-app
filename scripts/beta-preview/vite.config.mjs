import {defineConfig} from '../../frontend/node_modules/vite/dist/node/index.js';
import react from '../../frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../frontend',import.meta.url)),stub=fileURLToPath(new URL('./supabaseClient.js',import.meta.url));
export default defineConfig({root,envDir:false,plugins:[react(),{name:'local-beta-fixtures',enforce:'pre',resolveId(id){if(/(?:^|\/)supabaseClient(?:\.js)?$/.test(id))return stub;},transformIndexHtml(html){return html.replace('</body>','<script type="module" src="/@fs/'+fileURLToPath(new URL('./toolbar.js',import.meta.url))+'"></script></body>');}}],define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:5002'),'import.meta.env.VITE_TURNSTILE_SITE_KEY':JSON.stringify('')},server:{host:'127.0.0.1',port:5175,strictPort:true,fs:{allow:[fileURLToPath(new URL('../..',import.meta.url))]}}});
