const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const { json } = require("stream/consumers");
const { default: axios } = require("axios");
const HOST = "0.0.0.0";

const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;


const app = express();
app.use(cors("*"));
app.use(express.json());

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Permitir cualquier origen (ajústalo para producción)
    methods: ["GET", "POST"],
  },
});

const JWT_SECRET = process.env.SECRET;

// Middleware para autenticar el token JWT en Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.query.token;

  if (!token) {
    return next(
      new Error("Autenticación fallida: No se proporcionó un token.")
    );
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Autenticación fallida: Token inválido."));
    }

    // Almacena el ID del usuario en el socket
    socket.userId = decoded.id_user;
    next();
  });
});

// Mapa para almacenar conexiones de usuarios
let users = {};

// Manejar conexiones de Socket.IO
io.on("connection", (socket) => {
  const userId = socket.userId;
  users[userId] = socket;
  console.log("Usuario conectado " + socket.userId);

  // Desconexión del usuario
  socket.on("disconnect", () => {
    //console.log(`Usuario ${userId} se ha desconectado`);
    delete users[userId];
  });
});

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Extrae el token después de 'Bearer'
    //console.log(token);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      //console.log(decoded);

      if (err) {
        return res.sendStatus(403); // Token inválido
      }

      // Si el token es válido, guarda el id del usuario en la solicitud
      req.user = decoded;
      next();
    });
  } else {
    res.sendStatus(401); // No se proporcionó el token
  }
};

// Ruta de prueba en Express
app.get("/", (req, res) => {
  res.send(
    "Servidor Express con Socket.IO y JWT está funcionando nuevo cambio agregado"
  );
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        success: false,
        data: { message: 'Contraseña o Email incorrectos' }
      });
    }

    const response = await axios.post('https://comprasesg.com.mx/login', {
      email,
      password
    });

    // Suponiendo que la API Laravel responde con un JSON
    return res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al hacer login",
      error: error.response?.data || error.message
    });
  }
});

app.post("/send/requisicion-actualizada", authenticateJWT, (req, res) => {
  console.log(req.body);
  var userId = req.body.id_usuario_alertar;
  var folio = req.body.folio;
  var estatus = req.body.estatus;
  var URL = req.body.url_requisicion;

  if (users[userId]) {
    // Emitir el evento al usuario especificado
    users[userId].emit(`channel-user-${userId}`, {
      //message: "Nueva requisicion creada.",
      url: URL,
      message: `Folio ${folio ?? '"SIN DATO"'} actualizado a estatus: ${
        estatus ? estatus.toUpperCase() : '"SIN DATO"'
      }`,
    });

    console.log("Mensaje enviado al usuario " + userId);

    res.send("Mensaje enviado al usuario 11");
  } else {
    // Si el usuario no está conectado
    res.status(404).send("El usuario no está conectado");
  }
});

app.post("/send/requisicion/departamento", authenticateJWT, (req, res) => {
  console.log(req.body);
  var userId = req.body.id_usuario_alertar;
  var folio = req.body.folio;
  var estatus = req.body.estatus;
  var URL = req.body.url_requisicion;
  var cotizacion_especial = req.body.cotizacion_especial;
  var departamento_especial = req.body.departamento_especial;
  var departamento = req.body.departamento;

  var departamento_notificar = cotizacion_especial
    ? departamento_especial
    : departamento;

  if (departamento_notificar) {
    console.log(departamento_notificar);
    console.log(`channel-departamento-${departamento_notificar}`);

    try {
      io.emit(`channel-departamento-${departamento_notificar}`, {
        // EMITE EVENTO PARA NOTIFICAR A DEPARTAMENTO
        url: URL,
        message: `Folio ${folio ?? '"SIN DATO"'} actualizado a estatus: ${
          estatus ? estatus.toUpperCase() : '"SIN DATO"'
        }`,
      });
    } catch (error) {
      console.log(error);
    }

    console.log("Mensaje enviado al departamento " + departamento_notificar);

    res.send("Mensaje enviado al departamento " + departamento_notificar);
  } else {
    res.status(404).send("El usuario no está conectado");
  }
});

app.get('/send/requisicion/whatsapp', authenticateJWT, async (req, res) => {
  const client = require('twilio')(accountSid, authToken);

  try {
    var resTwilio = await client.messages
    .create({
        from: 'whatsapp:+14155238886',
        /* contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
        contentVariables: '{"1":"12/1","2":"3pm"}', */
        body: 'ESTE ES UN MENSAJE DE PRUEBA',
        to: 'whatsapp:+5218113953999'
    })
    /* .then(message => console.log(message.sid))
    .done(); */
    console.log(resTwilio);
    
    
  } catch (error) {
    return res.json({ error: error});
  }
  
  return res.json({ hola: 'hola' });
})

// Iniciar el servidor
server.listen(8888, HOST, () => {
  console.log("Servidor ejecutándose en http://localhost:8888");
});
