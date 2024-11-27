import express from 'express';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import { connectDB } from './config/dbConfig.mjs';
import superHeroRoutes from './routes/superHeroRoutes.mjs';
import SuperHero from './models/SuperHero.mjs';
import expressLayouts from 'express-ejs-layouts';


const app = express();
const PORT = process.env.PORT || 3000;

// Obtener __dirname en un módulo ESM
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const publicPath = path.join(__dirname, 'views', 'public', 'img', 'universo.png');
console.log('Image exists:', fs.existsSync(publicPath));

// Middleware para procesar datos del formulario
app.use(bodyParser.urlencoded({ extended: true }));  // Para formularios
app.use(bodyParser.json());  // Para JSON (si estás enviando en formato JSON

// Middleware para parsear JSON
app.use(express.json());

// Conexión a MongoDB
connectDB();


app.use(express.static(path.join(__dirname, 'views', 'public'), {
  setHeaders: (res, path) => {
    console.log('Serving file:', path);
  }
}));

console.log('Current directory:', __dirname);
console.log('Public directory path:', path.join(__dirname, 'views', 'public'));
console.log(path.join(__dirname, 'views', 'public'));

// Configura EJS como motor de plantillas
app.set('view engine', 'ejs');





// Middleware
app.use(expressLayouts);  // Middleware para layouts


// Middleware para establecer 'title' de manera global
app.use((req, res, next) => {
  res.locals.title = 'Lista de Superhéroes'; // Establece un título globalmente
  next();
});


app.get('/', (req, res) => {
  res.render('index', {
    title: 'Lista de Superhéroes',  // Definir el valor de 'title'
    superheroes: superheroesList   // Pasa los datos de superheroes aquí
  });
});

app.get('/superheroes', async (req, res) => {
  try {
    const superheroes = await SuperHero.find();
    res.render('index', { superheroes }); // Esto pasa los datos de superhéroes correctamente
  } catch (err) {
    console.error('Error al obtener superhéroes:', err);
    res.status(500).send('Error al obtener los superhéroes');
  }
});


// Ruta para mostrar el formulario de añadir superhéroe
app.get('/add-hero', (req, res) => {
  res.render('form');
});

// Ruta para manejar el envío del formulario y agregar un héroe a la base de datos
app.post('/superheroes', async (req, res) => {
  const { heroName, realName, heroAge, planetaOrigen, debilidad, poderes, aliados, enemigos } = req.body;

  // Validación simple
  if (!heroName || !realName || !heroAge || !poderes || !aliados || !enemigos) {
    return res.status(400).send('Faltan datos obligatorios.');
  }

  try {
    const nuevoHeroe = new SuperHero({
      nombreSuperHeroe: heroName,
      nombreReal: realName,
      edad: heroAge,
      planetaOrigen,
      debilidad,
      poderes: poderes.split(',').map(poder => poder.trim()),
      aliados: aliados.split(',').map(aliado => aliado.trim()),
      enemigos: enemigos.split(',').map(enemigo => enemigo.trim())
    });
    await nuevoHeroe.save();
    res.redirect('/superheroes');
  } catch (err) {
    console.error('Error al guardar el superhéroe:', err);
    res.status(500).send('Error al agregar el superhéroe.');
  }
});




console.log('Route registration check:');
console.log('Current routes:', 
  app._router.stack
    .filter(r => r.route)
    .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()}: ${r.route.path}`)
);

app.get('/superheroes/editar/:id', async (req, res) => {
  console.log('EDIT ROUTE SPECIFICALLY TRIGGERED');
  console.log('Params:', req.params);

  const { id } = req.params;

  try {
    const superHeroe = await SuperHero.findById(id);

    if (!superHeroe) {
      console.log('NO SUPERHERO FOUND WITH ID:', id);
      return res.status(404).send('Superhéroe no encontrado');
    }

    console.log('SUPERHERO FOUND:', superHeroe.nombreSuperHeroe);
    // Asegúrate de pasar 'superHeroe' (en singular) a la vista
    res.render('editar-superheroe', { superheroe: superHeroe });
  } catch (err) {
    console.error('CRITICAL ERROR IN EDIT ROUTE:', err);
    res.status(500).send('Error al obtener los datos del superhéroe');
  }
});



// BEFORE your API routes and 404 handler
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.path);
  next();
});

// Ruta para manejar la actualización de un superhéroe
app.post('/superheroes/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { heroName, realName, heroAge, planetaOrigen, debilidad, poderes, aliados, enemigos } = req.body;

  // Validación básica de los datos (puedes agregar más validaciones según sea necesario)
  if (!heroName || !realName || !heroAge) {
    return res.status(400).send('Faltan datos importantes para actualizar al superhéroe');
  }

  try {
    // Actualizar el superhéroe en la base de datos
    const updatedHeroe = await SuperHero.findByIdAndUpdate(id, {
      nombreSuperHeroe: heroName,
      nombreReal: realName,
      edad: heroAge,
      planetaOrigen,
      debilidad,
      poderes: poderes ? poderes.split(',') : [],
      aliados: aliados ? aliados.split(',') : [],
      enemigos: enemigos ? enemigos.split(',') : []
    }, { new: true }); // 'new: true' devuelve el documento actualizado

    if (!updatedHeroe) {
      return res.status(404).send('Superhéroe no encontrado para actualizar');
    }

    // Redirige a la lista de superhéroes después de actualizar
    res.redirect('/superheroes');  
  } catch (error) {
    console.error('Error al actualizar superhéroe:', error);
    res.status(500).send('Error al actualizar el superhéroe');
  }
});

app.post('/delete-hero/:id', async (req, res) => {
  console.log('Ruta de eliminación activada');
  const { id } = req.params;

  try {
    const hero = await SuperHero.findByIdAndDelete(id);

    if (!hero) {
      return res.status(404).json({ mensaje: 'Superhéroe no encontrado' });
    }

    res.redirect('/superheroes'); // Redirigir después de eliminar
  } catch (err) {
    console.error('Error al eliminar el superhéroe:', err);
    res.status(500).json({ mensaje: 'Error al eliminar el superhéroe' });
  }
});




// Configuración de rutas
app.use('/api', superHeroRoutes);

// // Manejo de errores para ruta no encontrada
app.use((req, res) => {
  res.status(404).send({ mensaje: "Ruta no encontrada" });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
