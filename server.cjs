const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Divyam@05",
  database: "dnstwister",
});

// Connect to DB
db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

// Signup route
app.post("/signup", (req, res) => {
  const { email, password } = req.body;
  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send({ id: result.insertId, email });
  });
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) {
      return res.status(401).send("Invalid credentials");
    }
    res.status(200).send({ id: results[0].customer_id, email });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
