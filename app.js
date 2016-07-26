
const path = require('path')  
const express = require('express')  
const exphbs = require('express-handlebars')

const app = express();

app.engine('.hbs', exphbs({  
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')  
app.set('views', path.join(__dirname, 'views'))  




var mysql = require("mysql");
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});

con.connect(function(err){
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});

con.end();








app.get('/', (request, response) => {  
  response.render('home', {
    name: 'John'
  })
})


 


app.listen(3000);