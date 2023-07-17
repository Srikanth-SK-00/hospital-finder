var express = require("express");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const mysql = require("mysql2");
const path = require("path");
const app = express();
const bcrypt = require("bcrypt");
app.use(express.json());
//ejs
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
//db
const sqldb = mysql.createConnection({
    host: "b63kqwjm6azlmbcijkqy-mysql.services.clever-cloud.com",
    user: "uvql1rtfxziunusj",
    password: "zCxls18oaaV5n5xZgqiD",
    database: "b63kqwjm6azlmbcijkqy",
});
sqldb.connect((err) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Connection established");
    }
})
//function
const userCredentials = {};
function sendOTPByEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "20tuec216@skct.edu.in",
            pass: "srikanth@2003",
        },
    });
    const mailOptions = {
        from: "20tuec216@skc.edu.in",
        to: email,
        subject: "OTP Verification",
        text: `Your OTP: ${otp}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error sending email:", error);
        } else {
            console.log("Email sent:", info.response);
        }
    });
}
function genotp() {
    const otp = crypto.randomInt(100000, 999999);
    return otp.toString();
}
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/login.html");
}).listen(8080);
app.get("/signup", (req, res) => {
    res.sendFile(__dirname + "/signup.html");
});
app.post("/signup", async (req, res) => {
    var name = req.body.name;
    var phno = req.body.phno;
    var address = req.body.address;
    var pincode = req.body.pincode;
    var email = req.body.email;
    const hashedpassword = await bcrypt.hash(req.body.password, 10);
    sqldb.connect();
    {
        const checkQuery = `SELECT * FROM userdetails WHERE email = ?`;
        sqldb.query(checkQuery, [email], (error, results) => {
            if (error) {
                throw error;
            }
            if (results.length > 0) {
                res.sendFile(__dirname + "/404.html");
            } else {
                var sql =
                    "INSERT INTO userdetails(name,email,password,phno,address,pincode) VALUES('" +
                    name +
                    "','" +
                    email +
                    "','" +
                    hashedpassword +
                    "','" +
                    phno +
                    "','" +
                    address +
                    "','" +
                    pincode +
                    "')";
                sqldb.query(sql, function (error) {
                    if (error) throw error;
                    console.log("user added");
                    res.redirect(`/user/${encodeURIComponent(email)}`);
                });
            }
        });
    }
});
//user login
app.get("/userlogin", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});
app.post("/login", async (req, res) => {
    const Email = req.body.email;
    const password = req.body.password;
    const query = "SELECT * FROM userdetails WHERE email = ?";
    sqldb.query(query, [Email], (error, results) => {
        if (error) {
            console.error("Error executing the query:", error);
            return;
        }
        if (results.length === 1) {
            const user = results[0];
            bcrypt.compare(password, user.password, (bcryptError, isMatch) => {
                if (bcryptError) {
                    console.error("Error comparing passwords:", bcryptError);
                    return;
                }
                if (isMatch) {
                    console.log("Login successful.");
                    res.redirect(`/user/${encodeURIComponent(Email)}`);
                } else {
                    res.send(`
              <script>
              alert('Invalid username or password');
              window.location.href = '/userlogin';
              </script>
            `);
                    console.log("Invalid username or password.");
                }
            });
        } else {
            res.send(`
          <script>
          alert('Invalid username');
          window.location.href = '/userlogin';
          </script>
        `);
            console.log("Invalid username or password.");
        }
    });
});
//user forget password
app.get("/forget", (req, res) => {
    s = false;
    res.render("forget", { s });
});
app.post("/forget", (req, res) => {
    const email = req.body.email;
    const otp = genotp();
    userCredentials[email] = { otp };
    sendOTPByEmail(email, otp);
    console.log("OTP generated and sent successfully");
    s = true;
    res.render("forget", { s });
});
//user verify otp
app.post("/verify", async (req, res) => {
    const otp = req.body.otp;
    const newpassword = req.body.password;
    const email = req.body.email;
    const storedCredentials = userCredentials[email];
    if (!storedCredentials || storedCredentials.otp !== otp) {
        res.send(
            `<script>
  alert('Invalid inputs');
  window.location.href = '/forget';
  </script>`
        );
        return;
    }
    sqldb.connect();
    {
        const hashedpassword = await bcrypt.hash(newpassword, 10);
        const updateQuery = "UPDATE userdetails SET password = ? WHERE email = ?";
        sqldb.query(updateQuery, [hashedpassword, email], (error) => {
            if (error) {
                console.error("Error updating password:", error);
                return;
            }
        });
    }
    res.send(
        `<script>
  alert('password updated');
  window.location.href = '/userlogin';
  </script>`
    );
});
//user page
app.get("/user/:email", function (req, res) {
    var email = req.params.email;
    res.render("user", { email: email })
});
app.get('/api/coordinates', async (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    console.log(latitude, longitude);
    async function fetchNearbyHospitals(latitude, longitude) {
        try {
            const { default: fetch } = await import('node-fetch');
            const addressResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const addressData = await addressResponse.json();
            const address = addressData.display_name;
            const overpassResponse = await fetch(
                `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${latitude},${longitude})[amenity=hospital];out;`
            );
            const overpassData = await overpassResponse.json();
            const hospitals = overpassData.elements;
            console.log(address)
            return { address, hospitals };
        } catch (error) {
            console.error('Error:', error);
            throw new Error('Error fetching nearby hospitals.');
        }
    }
    try {
        const result = await fetchNearbyHospitals(latitude, longitude);
        const hospitals = result.hospitals;
        res.json(hospitals)
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Error fetching nearby hospitals.' });
    }
});
//profile update
app.get("/profile/:email", (req, res) => {
    var email = req.params.email;
    const checkQuery = `SELECT * FROM userdetails WHERE email = ?`;
    sqldb.query(checkQuery, [email], (error, results) => {
        if (error) {
            throw error;
        }
        var i = results[0];
        res.render("userprofile", {
            name: i.name,
            email: i.email,
            phno: i.phno,
            address: i.address,
            pincode: i.pincode,
        });
    });
});
app.post("/userchanges", (req, res) => {
    var name = req.body.name;
    var phno = req.body.phno;
    var address = req.body.address;
    var pincode = req.body.pincode;
    var email = req.body.email;
    const sql = `
    UPDATE userdetails
    SET name = ?,
        address = ?,
        phno = ?,
        pincode = ?
    WHERE email = ?
  `;
    sqldb.query(sql, [name, address, phno, pincode, email], function (err) {
        if (err) throw err;
    });
    res.send(`
  <script>
  alert('details updated successfully');
  window.location.href = '/user/${email}';
  </script>
  `);
});