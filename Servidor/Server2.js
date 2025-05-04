const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db.js");

const app = express();
app.use(express.json());
app.use(cors());

const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Registro de usuario
app.post("/register", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO desarrollo.users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );

        const user = result.rows[0];
        res.status(200).json({ message: "Usuario registrado", user});
    } catch (error) {
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// Login de usuario
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query("SELECT * FROM desarrollo.users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Acceso denegado" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token inválido" });

        req.user = user;
        next();
    });
};

// Ruta protegida (Ejemplo: Dashboard)
app.get("/dashboard", verifyToken, async (req, res) => {
    try {
        const user = await pool.query("SELECT id, email FROM desarrollo.users WHERE id = $1", [req.user.id]);
        res.json({ message: "Accediste al dashboard", user: user.rows[0] });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuario" });
    }
});

app.get("/login", (req, res) => {
    res.json({ message: "Agus se la come", user: req.user });
    console.log("Algun curioso quizo entrar");
});

app.get("/", (req, res) => {
    res.redirect("/login");
})

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));