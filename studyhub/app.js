const express = require("express")
const {exec} = require("node:child_process")
const http = require("http")


const app = express()
const server = http.createServer(app)
const PORT = 3000

app.set("view engine","ejs")
app.use(express.static("public"))

// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// for database
// app.get("/studygroups", (req, res) => {
//     connection.query("SELECT * FROM studygroups", (err, results) => {
//         if (err) throw err;

//         res.render("studyGroups", {
//             studyGroups: results
//         });
//     });
// });

app.get("/studygroups", (req, res) => {

    const studyGroups = [
        {
            id: 1,
            groupName: "Java Study",
            module: "C237",
            date: "2026-06-30",
            time: "2:00 PM",
            location: "Library",
            members: 4
        },
        {
            id: 2,
            groupName: "Web Development",
            module: "C369",
            date: "2026-07-01",
            time: "10:00 AM",
            location: "Lab 2",
            members: 6
        }
    ];

    res.render("studyGroups", {
        studyGroups
    });

});

// for database
// app.get("/studygroups/:id", (req, res) => {
//     const id = req.params.id;

//     connection.query(
//         "SELECT * FROM studygroups WHERE id = ?",
//         [id],
//         (err, results) => {
//             if (err) throw err;

//             res.render("studyGroupDetails", {
//                 group: results[0]
//             });
//         }
//     );
// });

app.get("/studygroups/:id", (req, res) => {

    const studyGroups = [
        {
            id: 1,
            groupName: "Java Study",
            module: "C237",
            date: "2026-06-30",
            time: "2:00 PM",
            location: "Library",
            members: 4,
            description: "Preparing for CA2."
        },
        {
            id: 2,
            groupName: "Web Development",
            module: "C369",
            date: "2026-07-01",
            time: "10:00 AM",
            location: "Lab 2",
            members: 6,
            description: "Working on the group project."
        }
    ];

    const id = parseInt(req.params.id);
    const group = studyGroups.find(g => g.id === id);

    if (!group) {
        return res.status(404).send("Study group not found");
    }

    res.render("studyGroupDetails", {studyGroups: [group] });

});

server.listen(PORT,()=> console.log("connected to localhost"),exec(`start http://localhost:${PORT}/`))