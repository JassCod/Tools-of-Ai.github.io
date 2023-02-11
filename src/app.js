const express = require("express");
const app = express();
const port = process.env.PORT || 8000;
const path = require("path");
const hbs = require('hbs')


// public static path
const static_path = (path.join(__dirname, "../public"));
const template_path = (path.join(__dirname, "../templates/views"));
const partials_path = (path.join(__dirname, "../templates/patials"));


app.set('views engine', 'hbs')
app.set('views', template_path)
hbs.registerPartials(partials_path)

app.use(express.static(static_path))

// routing
app.get("/", (req, res) => {
    res.render("index.hbs")
})

app.get("/adobe", (req, res) => {
    res.render("adobe.hbs")
})

app.get("/build", (req, res) => {
    res.render("build.hbs")
})

app.get("/chatGPT", (req, res) => {
    res.render("chatGPT.hbs")
})

app.get("/CopyAI", (req, res) => {
    res.render("CopyAi.hbs")
})

app.get("/flair", (req, res) => {
    res.render("flair.hbs")
})

app.get("/Gling", (req, res) => {
    res.render("Gling.hbs")
})

app.get("/HumataAi", (req, res) => {
    res.render("HumataAi.hbs")
})

app.get("/PowerMode", (req, res) => {
    res.render("PowerMode.hbs")
})

app.get("/Replit", (req, res) => {
    res.render("Replit.hbs")
})

app.get("/Rytr", (req, res) => {
    res.render("Rytr.hbs")
})

app.get("/Slides", (req, res) => {
    res.render("Slides.hbs")
})

app.get("/SuggestGift", (req, res) => {
    res.render("SuggestGift.hbs")
})




// app.get("*", (req, res) => {
//     res.render("404error.hbs", {
//         errorMsg: "Oops! Page Not Found"
//     })
// })



app.listen(port, () => {
    console.log("listening on port :", port)
});