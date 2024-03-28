require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const SMTPTransport = require('nodemailer/lib/smtp-transport');
const request = require('request');
const riddle = require('./riddle');
const codes = require('./code');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const pokemon = require('./pokemon');
const path1 = require('./path1');
const path2 = require('./path2');
const path3 = require('./path3');
const hint = require('./hint')
const routes = require('./route');

const app = express();
const PORT = 5000;


// Set public folder as static folder for static files
app.use(express.static(__dirname + '/public'));

// parse application/json
app.use(bodyParser.json())

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// Set EJS as templating engine
app.set('view engine', 'ejs');

// Set cors
app.use(cors());

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(`mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.bwi1a0u.mongodb.net/?retryWrites=true&w=majority`)

const teamSchema = new mongoose.Schema({
    teamName: String,
    leaderName: String,
    email: String,
    password: String,
    member2: String,
    member3: String,
    member4: String,
    member5: String,
    points: Number,
    next: String
});

const team = mongoose.model('team', teamSchema);

const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});

adminSchema.plugin(passportLocalMongoose);

const admin = mongoose.model('admin', adminSchema);

passport.use(admin.createStrategy());
// passport.serializeUser(admin.serializeUser());
// passport.deserializeUser(admin.deserializeUser());
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

// app.get('/setup', (req, res) => {
//     team.updateMany({}, { $set: { points: 0 } }).then(() => {
//         res.send('done');
//     });
// })

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/admin', (req, res) => {
    if (req.isAuthenticated()) {
        var members = 0;
        team.find().then((data) => {
            data.forEach((tm) => {
                members += 1;
                if (tm.member2 != '') {
                    members += 1;
                }
                if (tm.member3 !== '') {
                    members += 1;
                }
                if (tm.member4 !== '') {
                    members += 1;
                }
                if (tm.member5 !== '') {
                    members += 1;
                }
            });
            res.render('admin', { noOfParticipants: members });
        });
    }
    else {
        res.redirect('/admin/login');
    }
});

app.post('/admin/card-submit', (req, res) => {
    const email = req.body.email;

    team.updateOne({ email: email }, { $inc: { points: 3 } }).then(() => {
        res.send('Points updated');
    }).catch((err) => {
        console.log(err);
    });

})

// app.get('/admin/register', (req, res) => {
//     res.render('adminRegister', { message: "" });
// });

// app.post('/admin/register', (req, res) => {
//     if (req.body.username === "" || req.body.password === "") {
//         res.render('adminRegister', { message: "Please fill all the required fields" });
//     }
//     else if (req.body.password.length < 8) {
//         res.render('adminRegister', { message: "Password should be atleast 8 characters long" });
//     }
//     else {
//         admin.register({ username: req.body.username }, req.body.password).then((adm) => {
//             passport.authenticate('local')(req, res, () => {
//                 res.redirect('/admin');
//             });
//         }).catch((err) => {
//             console.log(err);
//             res.redirect('/admin/register');
//         });
//     }
// });

app.get('/admin/login', (req, res) => {
    res.render('adminLogin');
});

app.post('/admin/login', (req, res) => {
    const adm = new admin({
        username: req.body.username,
        password: req.body.password
    });

    req.login(adm, (err) => {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/admin');
            });
        }
    });
});

app.post('/admin/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect('/admin/login');
        }
    })
});

app.get('/admin/scoreboard', (req, res) => {
    if (req.isAuthenticated()) {
        team.find().then((data) => {
            res.render('scoreboard', { data: data });
        });
    }
    else {
        res.redirect('/admin/login');
    }
});

app.post('/admin/delete/:id', (req, res) => {
    team.findByIdAndRemove(req.params.id).then(() => {
        res.redirect('/admin/scoreboard');
    });
});

app.post('/admin/edit/:id', (req, res) => {
    team.findById(req.params.id).then((data) => {
        res.render('edit', { data: data });
    });
});

app.post('/start', async (req, res) => {
    team.find().then(async (data) => {
        for (let i = 0; i < data.length; i++) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: `${process.env.EMAIL}`,
                    pass: `${process.env.PASSWORD}`
                }
            });

            let mail = {
                from: `${process.env.EMAIL}`,
                to: `${data[i].email}`,
                subject: 'Game Started',
                html: `
                        <h1>Your First Clue is here GOOD LUCK for the Game</h1>
                        <div>
                            ${riddle[data[i].next]}
                        </div>
                        <div>
                            https://pokemonxhunter.onrender.com/riddle/${data[i].next}
                        </div>
                        <div>
                            <h2>Contacts for any query</h2>
                            <p>IEEE YMCA SB JSEC - Daniyal Jawed - 6287912722</p>
                            <p>IEEE SIGHT SB Chairperson - Nishant - 9896774495</p>
                            <p>IEEE WIE SB Chairperson - Asif - 9560491809</p>
                        </div>
                    `
            }

            await transporter.sendMail(mail, (err, data) => {
                if (err) {
                    console.log(err)
                } else {
                    res.render('message', { message: "Mail Sent" });
                }
            })
        }
    });
});


app.post('/start-single', async (req, res) => {
    const email = req.body.email;
    team.findOne({ email: email }).then(async (data) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: `${process.env.EMAIL}`,
                pass: `${process.env.PASSWORD}`
            }
        });

        let mail = {
            from: `${process.env.EMAIL}`,
            to: `${email}`,
            subject: 'Game Started',
            html: `
                    <h1>Your First Clue is here GOOD LUCK for the Game</h1>
                    <div>
                        ${riddle[data.next]}
                    </div>
                    <div>
                        https://pokemonxhunter.onrender.com/riddle/${data.next}
                    </div>
                    <div>
                        <h2>Contacts for any query</h2>
                        <p>IEEE YMCA SB JSEC - Daniyal Jawed - 6287912722</p>
                        <p>IEEE SIGHT SB Chairperson - Nishant - 9896774495</p>
                        <p>IEEE WIE SB Chairperson - Asif - 9560491809</p>
                    </div>
                `
        }

        await transporter.sendMail(mail, (err, data) => {
            if (err) {
                console.log(err)
            } else {
                console.log(data)
                res.redirect('/admin');
            }
        })

    });
});


app.post('/edit', (req, res) => {
    const email = req.body.email;

    team.findOneAndUpdate({ email: email }, { next: req.body.next }).then(() => {
        res.redirect('/admin/scoreboard');
    }).catch((err) => {
        console.log(err);
        res.status(500).send('Something went wrong');
    });
})

app.get('/register', (req, res) => {
    res.render('register-end');
})

app.get('/admin/register', (req, res) => {
    res.render('register', { message: "" });
});

app.post('/admin/register', async (req, res) => {
    if (req.isAuthenticated()) {
        const teamName = req.body.teamName;
        const leaderName = req.body.leaderName;
        const email = req.body.email;
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;
        const member2 = req.body.member2;
        const member3 = req.body.member3;
        const member4 = req.body.member4;
        const member5 = req.body.member5;

        if (teamName === "" || leaderName === "" || email === "" || password === "" || confirmPassword === "" || member2 === "") {
            res.render('register', { message: "Please fill all the required fields" });
        }
        else if (!email.includes('@') || !email.includes('.')) {
            res.render('register', { message: "Please enter a valid email" });
        }
        else if (password !== confirmPassword) {
            res.render('register', { message: "Passwords don't match" });
        }
        else if (password.length < 8) {
            res.render('register', { message: "Password should be atleast 8 characters long" });
        }
        else {
            team.findOne({ email: email }).then((err, data) => {
                if (data) {
                    res.render('register', { message: "Email already registered" });
                }
            });

            const newTeam = new team({
                teamName: teamName,
                leaderName: leaderName,
                email: email,
                password: password,
                member2: member2,
                member3: member3,
                member4: member4,
                member5: member5,
                points: 0,
                next: pokemon[Math.floor(Math.random() * pokemon.length)]
            });


            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: `${process.env.EMAIL}`,
                    pass: `${process.env.PASSWORD}`
                }
            });

            let mail = {
                from: `${process.env.EMAIL}`,
                to: `${email}`,
                subject: 'Team Registered Successfully',
                html: `
                        <div>
                            <h1>Team Registered Successfully</h1>
                            <p>Team Name: ${teamName}</p>
                            <p>Leader Name: <b>${leaderName}</b></p>
                            <p>Team Members: <b>${member2}</b> <br> <b>${member3}</b> <br> <b>${member4}</b> <br> <b>${member5}</b></p>
                            <p>Join our WhatsApp group to stay updated: https://chat.whatsapp.com/Gxi1DJZtonp0CqPFebZ0Y4</p>
                        </div>
                        <div>
                        <h2>Contacts</h2>
                            <p>IEEE YMCA SB JSEC - Daniyal Jawed - 6287912722</p>
                            <p>IEEE SIGHT SB Chairperson - Nishant - 9896774495</p>
                            <p>IEEE WIE SB Chairperson - Asif - 9560491809</p>
                        </div>
                    `,
                attachments: [
                    {
                        filename: 'GUIDELINES.docx',
                        path: './public/GUIDELINES.docx',
                        contentType: 'application/docx'
                    },
                    {
                        filename: 'HunterXPokemon.png',
                        path: './public/HunterXPokemon.png',
                        contentType: 'application/png'
                    }
                ]
            }

            await transporter.sendMail(mail, (err, data) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log(data)
                }
            })

            newTeam.save().then(() => {
                res.render('confirm');
            }).catch(() => {
                res.redirect('/register');
            })
        }
    }
    else {
        res.redirect('/admin/login');
    }
});
app.get('/riddle/ankur', (req, res) => {
    res.render('message', { message: "Meet me at Computer Department, Ankur Yadav" })
});

app.get('/riddle/mohan', (req, res) => {
    res.render('message', { message: "Meet me at the Mother Dairy, Mohan(M.K)" })
});

app.get('/riddle/hemang', (req, res) => {
    res.render('message', { message: "Meet me at the front of Mechanical Department, Hemang" })
});

app.get('/riddle/:code', (req, res) => {
    const route = routes[req.params.code];
    res.render('riddle', { route: route, riddle: riddle[req.params.code] });
})




app.get(`/:code`, (req, res) => {
    const route = req.params.code;
    const image = `/images/${codes[req.params.code]}.png`;
    res.render('game', { route: route, riddle: riddle[codes[req.params.code]], image: image });
});

app.post(`/:code`, (req, res) => {
    const email = req.body.email;
    team.findOne({ email: email }).then((data) => {
        let nxt = data.next;

        if (nxt != codes[req.params.code]) {
            res.render('message', { message: "Wrong Answer" })
        }
        else {
            // res.send(codes[req.params.code] === path3['mr_mime']);
            if (path1[codes[req.params.code]] != undefined) {
                team.updateOne({ email: email }, { $inc: { points: 1 }, $set: { next: path1[nxt] } }).then(async () => {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: `${process.env.EMAIL}`,
                            pass: `${process.env.PASSWORD}`
                        }
                    });

                    let mail = {
                        from: `${process.env.EMAIL}`,
                        to: `${email}`,
                        subject: 'HunterXPokemon',
                        html: `
                                <h1>Your Next Clue is here GOOD LUCK for the Game</h1>
                                <div>
                                    ${riddle[data.next]}
                                </div>
                                <div>
                                    https://pokemonxhunter.onrender.com/riddle/${data.next}
                                </div>
                                <div>
                                    <h2>Contacts for any query</h2>
                                    <p>IEEE YMCA SB JSEC - Daniyal Jawed - 6287912722</p>
                                    <p>IEEE SIGHT SB Chairperson - Nishant - 9896774495</p>
                                    <p>IEEE WIE SB Chairperson - Asif - 9560491809</p>
                                    </div>
                            `
                    }

                    await transporter.sendMail(mail, (err, data) => {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(data)
                            res.redirect('/admin');
                        }
                    })

                    res.render('riddle', { riddle: riddle[path1[nxt]] });
                }).catch((err) => {
                    console.log(err);
                    res.status(500).send('Something went wrong');
                });
            }
            else if (path2[codes[req.params.code]] != undefined) {
                team.updateOne({ email: email }, { $inc: { points: 1 }, $set: { next: path2[nxt] } }).then(async () => {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: `${process.env.EMAIL}`,
                            pass: `${process.env.PASSWORD}`
                        }
                    });

                    let mail = {
                        from: `${process.env.EMAIL}`,
                        to: `${email}`,
                        subject: 'HunterXPokemon',
                        html: `
                                <h1>Your Next Clue is here GOOD LUCK for the Game</h1>
                                <div>
                                    ${riddle[data.next]}
                                </div>
                                <div>
                                    https://pokemonxhunter.onrender.com/riddle/${data.next}
                                </div>
                                <div>
                                    <h2>Contacts for any query</h2>
                                    <p>IEEE YMCA SB JSEC - Daniyal Jawed - 6287912722</p>
                                    <p>IEEE SIGHT SB Chairperson - Nishant - 9896774495</p>
                                    <p>IEEE WIE SB Chairperson - Asif - 9560491809</p>
                                </div>
                            `
                    }

                    await transporter.sendMail(mail, (err, data) => {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(data)
                            res.redirect('/admin');
                        }
                    })

                    res.render('riddle', { riddle: riddle[path2[nxt]] });
                }).catch((err) => {
                    console.log(err);
                    res.status(500).send('Something went wrong');
                });
            }
            else if (path3[codes[req.params.code]] != undefined) {
                team.updateOne({ email: email }, { $inc: { points: 1 }, $set: { next: path3[nxt] } }).then(async () => {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: `${process.env.EMAIL}`,
                            pass: `${process.env.PASSWORD}`
                        }
                    });

                    let mail = {
                        from: `${process.env.EMAIL}`,
                        to: `${email}`,
                        subject: 'HunterXPokemon',
                        html: `
                                <h1>Your Next Clue is here GOOD LUCK for the Game</h1>
                                <div>
                                    ${riddle[data.next]}
                                </div>
                                <div>
                                    https://pokemonxhunter.onrender.com/riddle/${data.next}
                                </div>
                                <div>
                                    <h2>Contacts for any query</h2>
                                    <p>IEEE YMCA SB JSEC - Daniyal Jawed - 6287912722</p>
                                    <p>IEEE SIGHT SB Chairperson - Nishant - 9896774495</p>
                                    <p>IEEE WIE SB Chairperson - Asif - 9560491809</p>
                                    </div>
                            `
                    }

                    await transporter.sendMail(mail, (err, data) => {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(data)
                            res.redirect('/admin');
                        }
                    })
                    res.render('riddle', { riddle: riddle[path3[nxt]] });
                }).catch((err) => {
                    console.log(err);
                    res.status(500).send('Something went wrong');
                });
            }
            else {
                res.send('hi')
            }
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



// app.get('/hint/:code', (req, res) => {
//     const image = `/images/${codes[req.params.code]}.png`
//     res.render('hint', { image: image, code: req.params.code });
// });

// app.post('/hint/:code', (req, res) => {
//     const email = req.body.email;
//     const pass = req.body.password;
//     team.findOne({ email: email }).then((data) => {
//         if(pass != data.password){
//             res.render('message',{message: "Wrong Password"});
//         }
//         if (data.hintsLeft === 0) {
//             res.render('message', {message: "No hints Left"});
//         }
//         else {
//             team.updateOne({ email: email }, { $inc: { hintsLeft: -1 }, $inc : {points : -1} }).then(() => {
//                 res.render('message', { message: hint[codes[req.params.code]] });
//             }).catch((err) => {
//                 console.log(err);
//                 res.status(500).send('Something went wrong');
//             });
//         }
//     });
// });

// app.post('/hint-single',(req,res)=>{
//     const email = req.body.email;
//     const hnts = Number.parseInt(req.body.hint);

//     team.findOne({email:email}).then((data)=>{
//         team.updateOne({email:email},{$inc:{hintsLeft:hnts}}).then(()=>{
//             res.redirect('/admin');
//         }).catch((err)=>{
//             console.log(err);
//             res.status(500).send('Something went wrong');
//         });
//     });
// });