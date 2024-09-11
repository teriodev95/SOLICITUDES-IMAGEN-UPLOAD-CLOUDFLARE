import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors({
	origin: '*',
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}));

type Env = {
	MY_R2_BUCKET: R2Bucket;
	R2_PUBLIC_HOST: string;
};

app.post('/upload', async (c) => {
	const formData = await c.req.parseBody();
	const file = formData['file'];

	if(!file ){
		return c.text('No se recibio ningun archivo', 400);
	}

	if (typeof file === 'string') {
		return c.text('Formato incorrecto', 400);
	}

	if (!['image/jpeg', 'image/png'].includes(file.type)) {
		return c.text('Tipo de archivo invalido. Solo JPG y PNG estan permitidos.', 400);
	}
	const date =new Date().toLocaleString('es-ES').replace(/\//g, '-').replace(/:/g, '-').replace(/ /g, '').replace(/,/g, '_');
	const fileName = `${date}UTC-${file.name}`;
	const env = c.env as Env; 

	try {
		if (!env.MY_R2_BUCKET) {
		throw new Error('R2 bucket is not defined in the environment.');
		}

		await env.MY_R2_BUCKET.put(fileName, file.stream(), {
			httpMetadata: {
				contentType: file.type,
			},
		});

		const publicUrl = `https://${env.R2_PUBLIC_HOST}/${fileName}`;

		return c.json({ success: true, url: publicUrl });
	} catch (error) {
		console.error('Error subiendo archivo a R2:', error);
		return c.text('Error subiendo archivo', 500);
	}
});

app.all('*', (c) => c.text('Metodo no permitido', 405));

export default app;
