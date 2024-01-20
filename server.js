const express = require("express");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const knex = require("knex");
const cors = require("cors");

const app = express();

app.use(cors())

app.use(bodyParser.json());

const saltRounds = 10;

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "",
    database: "face_detection",
  },
});


app.post("/signin", (req, res) => {
    const {email, password} = req.body
    console.log("ew---", req.body);
    db.select('*').from('login').where("email", "=", email)
    .then(data => {
        if(data.length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
        }
      const isValid = bcrypt.compareSync(password, data[0].password);
      if (isValid) {
        res.json({ message: 'Authentication successful' });
      } else {
        res.status(401).json({ error: 'Invalid email or password' });
      }
    })
    .catch(err => console.log(err))
});

app.post("/register", (req, res) => {
  const {email,password, name} = req.body
  bcrypt.genSalt(saltRounds, function (err, salt) {
  bcrypt.hash(password, salt, function (err, hash) {
    db.transaction(async (trx) => {
        try {
            const [loginEmail] = await trx("login")
              .returning("email")
              .insert({
                name: name,
                password: hash,
                email: email,
              });
              const parsedEmail = loginEmail.email;
            const [user] = await trx("users")
              .returning("*")
              .insert({
                email: parsedEmail,
                username: name,
                joined: new Date(),
              });
  
            res.json(user);
          }
          catch (error) {
            console.error('Error:', error);
           await trx.rollback();
            res.status(500).json({ error: 'Internal Server Error' });
          }
          finally {
           await trx.commit();
          }
      }) 
    });    
  });
});

app.get("/profile/:id", (req, res) => {
  const user_id = parseInt(req.params.id);
  console.log(user_id);
  db.select("*")
    .from("users")
    .where({ user_id })
    .then((data) => {
      if (data.length) {
        res.json(data[0]);
      } else {
        res.status(400).json("user not found");
      }
    })
    .catch((err) => console.log(err));
});

app.put("/image", (req, res) => {
  const id = parseInt(req.body.user_id);
  const incrementAmount = 1;
  db("users")
    .where("user_id", id)
    .update({
      enteries: db.raw('"enteries"::integer + ?', incrementAmount),
    })
    .returning("enteries")
    .then((data) => {
      res.json({ entries: data[0] });
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("app is running on port 3000");
});
