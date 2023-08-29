// api to use to search recipes:https://webknox-recipes.p.rapidapi.com/recipes/search


const fetch = require('node-fetch');
const express = require("express");
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = dbConnection();
'use strict';
var sessionStorage = require('sessionstorage');
//second api bmi calculator
const options = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': '6a4d6691c5mshea41b363cba2576p139994jsn7e4c59948d94',
    'X-RapidAPI-Host': 'fitness-calculator.p.rapidapi.com'
  }
};

app.set("view engine", "ejs");
app.use(express.static("public"));
//to parse Form data sent using POST method
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))


//routes
app.get('/', (req, res) => {
  if (req.session.authenticated) {
    let userInfo = sessionStorage.getItem("userInfo");
    res.render('home', { "userInfo": userInfo });
  } else {
    res.render('login');
  }
});



app.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy();
  res.redirect('/');
});



app.post('/login', async (req, res) => {

  let username = req.body.username;
  let password = req.body.password;
  let passwordHash = "";
  let sql = `SELECT password
             FROM mp_accounts
             WHERE username = ?`;
  let rows = await executeSQL(sql, [username]);
  if (rows.length > 0) {

    passwordHash = rows[0].password;
  }

  const match = await bcrypt.compare(password, passwordHash);

  if (match) {
    req.session.authenticated = true;
    sql = `SELECT *
             FROM mp_accounts
             WHERE username = ?`;
    let userInfo = await executeSQL(sql, [username]); userInfo = userInfo[0];

    console.log(userInfo);
    //store users account sql row in userInfo session storage
    sessionStorage.setItem("userInfo", userInfo);

    res.render('home', { "userInfo": userInfo });
  } else {
    res.render('login', { "error": "Wrong Credentials!" })
  }
});



//loads signup page
app.get('/signup', (req, res) => {
  res.render('signup');
});



//what happens when you click signup button on signup page
app.post('/signup', async (req, res) => {

  let inputUserName = req.body.username;


  let sql = `SELECT COUNT(username) AS duplicates
             FROM mp_accounts 
             WHERE username = ?
            `;

  // after authenticated render '/' route it will be home page once authenticated

  let params = [inputUserName];
  let data = await executeSQL(sql, params);

  if (data[0].duplicates == 1) {
    console.log("duplicate");
    res.render('signup', { "error": "Wrong Credentials!" })

  } else {
    console.log("No duplicate usernames found in database, safe to create and log new user.");

    let inputPassword = req.body.password;
    const saltRounds = 10;
    let salt = bcrypt.genSaltSync(saltRounds);
    let hash = bcrypt.hashSync(inputPassword, salt);

    let sql = `INSERT INTO mp_accounts
             (username,password)
                 VALUES
                 (?, ?)`;
    let params = [inputUserName, hash];
    await executeSQL(sql, params);

    //no duplicate in database of username inputed and new user should have been put inside database right before this comment. Next check if info is inside database then authenticate and log user in. 
    sql = `SELECT COUNT(username) AS duplicates
             FROM mp_accounts 
             WHERE username = ? and password = ?
            `;
    params = [inputUserName, hash];
    data = await executeSQL(sql, params);
    if (data[0].duplicates == 1) {
      console.log("Found users credentials in database from signup, loggin in user now...")

      req.session.authenticated = true;
      sessionStorage.setItem("userInfo", userInfo);
      res.render('home');
    } else {
      error("Error Signing Up account info not logged into database properly when last signup check happened on database.")
    }
  }

});



app.get('/recipes', isAuthenticated, (req, res) => {

  res.render('recipes');

});



app.post('/recipe', isAuthenticated, async (req, res) => {

  let userInfo = sessionStorage.getItem('userInfo');
  let recipeName = req.body.recipeName;
  let ingredients = req.body.ingredients;
  let instructions = req.body.instructions;
  let fpic = req.body.foodPic;
  let sql = `INSERT INTO mp_userrecipes
             (recipeName,ingredientList, instructions, imageLink, accountId)
                 VALUES
                 (?, ?, ?, ?, ?)`;
  let params = [recipeName, ingredients, instructions, fpic, userInfo.accountId];
  let rows = await executeSQL(sql, params);
  res.redirect('/recipes');

});



//url is fixed and is working
app.get('/recipeResults', isAuthenticated, async (req, res) => {

  let keyword = req.query.recipeSearch;

  let url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${keyword}`;

  let response = await fetch(url);
  let data = await response.json();
  console.log(data.meals);
  res.render('recipeList', { "data": data });
});


app.post('/fav', (req, res) => {

  let userInfo = sessionStorage.getItem('userInfo');
  let list = req.body.favBtn;
  console.log(list.value);
});



app.get('/calendar', isAuthenticated, async (req, res) => {

  let sql = `SELECT *
             FROM mp_userrecipes`;
  let data = await executeSQL(sql);
  //console.log("data: ", data);
  let userInfo = sessionStorage.getItem("userInfo");
   sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ?`;
   let params = [userInfo.accountId];
   userCalendarRecipes = await executeSQL(sql, params);

  
    //block
   var bMonDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
    let timeSlot = new Date(2022, 11, 05, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 05, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes")
    console.log("temp[0]: ",temp[0]);
    bMonDefault = temp[0];
    res.locals.bMonDefault = bMonDefault
  } else {
    res.locals.bMonDefault = null;
  } //block

  //block
   var bTueDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 06, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 06, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    bTueDefault = temp[0];
    res.locals.bTueDefault = bTueDefault;
  } else {
    res.locals.bTueDefault = null;
  } //block

  //block
   var bWedDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 07, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 07, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    bWedDefault = temp[0];
    res.locals.bWedDefault = bWedDefault;
  } else {
    res.locals.bWedDefault = null;
  } //block

  //block
   var bThuDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 08, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 08, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    bThuDefault = temp[0];
    res.locals.bThuDefault = bThuDefault;
  } else {
    res.locals.bThuDefault = null;
  } //block

  //block
   var bFriDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 09, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 09, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    bFriDefault = temp[0];
    res.locals.bFriDefault = bFriDefault;
  } else {
    res.locals.bFriDefault = null;
  } //block

  //block
   var bSatDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 10, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 10, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    bSatDefault = temp[0];
    res.locals.bSatDefault = bSatDefault;
  } else {
    res.locals.bSatDefault = null;
  } //block

  //block
   var bSunDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 11, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 11, 07, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    bSunDefault = temp[0];
    res.locals.bSunDefault = bSunDefault;
  } else {
    res.locals.bSunDefault = null;
  } //block

  //block
   var lMonDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 05, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 05, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lMonDefault = temp[0];
    res.locals.lMonDefault = lMonDefault;
  } else {
    res.locals.lMonDefault = null;
  } //block

    //block
   var lTueDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 06, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 06, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lTueDefault = temp[0];
    res.locals.lTueDefault = lTueDefault;
  } else {
    res.locals.lTueDefault = null;
  } //block

  //block
   var lWedDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 07, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 07, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lWedDefault = temp[0];
    res.locals.lWedDefault = lWedDefault;
  } else {
    res.locals.lWedDefault = null;
  } //block

  //block
   var lThuDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 08, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 08, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lThuDefault = temp[0];
    res.locals.lThuDefault = lThuDefault;
  } else {
    res.locals.lThuDefault = null;
  } //block

  //block
   var lFriDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 09, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 09, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lFriDefault = temp[0];
    res.locals.lFriDefault = lFriDefault;
  } else {
    res.locals.lFriDefault = null;
  } //block

  //block
   var lSatDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 10, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 10, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lSatDefault = temp[0];
    res.locals.lSatDefault = lSatDefault;
  } else {
    res.locals.lSatDefault = null;
  } //block

  //block
   var lSunDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 11, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 11, 12, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    lSunDefault = temp[0];
    res.locals.lSunDefault = lSunDefault;
  } else {
    res.locals.lSunDefault = null;
  } //block

  //block
   var dMonDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 05, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 05, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dMonDefault = temp[0];
    res.locals.dMonDefault = dMonDefault;
  } else {
    res.locals.dMonDefault = null;
  } //block

  //block
   var dTueDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 06, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 06, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dTueDefault = temp[0];
    res.locals.dTueDefault = dTueDefault;
  } else {
    res.locals.dTueDefault = null;
  } //block

  //block
   var dWedDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 07, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 07, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dWedDefault = temp[0];
    res.locals.dWedDefault = dWedDefault;
  } else {
    res.locals.dWedDefault = null;
  } //block

    //block
   var dThuDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 08, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 08, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dThuDefault = temp[0];
    res.locals.dThuDefault = dThuDefault;
  } else {
    res.locals.dThuDefault = null;
  } //block

  //block
   var dFriDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 09, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 09, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dFriDefault = temp[0];
    res.locals.dFriDefault = dFriDefault;
  } else {
    res.locals.dFriDefault = null;
  } //block

  //block
   var dSatDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 10, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 10, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dSatDefault = temp[0];
    res.locals.dSatDefault = dSatDefault;
  } else {
    res.locals.dSatDefault = null;
  } //block

    //block
   var dSunDefault = null;
   sql = `SELECT COUNT(timeSlot) AS doesExist
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
     timeSlot = new Date(2022, 11, 11, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
     tempDoesExist = await executeSQL(sql, params);
console.log("does exist? ", tempDoesExist[0].doesExist);
  if(tempDoesExist[0].doesExist == 1){
    sql = `SELECT *
             FROM mp_mealCalendar
             WHERE accountId = ? and timeSlot = ?`;
   let timeSlot = new Date(2022, 11, 11, 17, 00, 00); 
    params = [userInfo.accountId, timeSlot];
    let temp = await executeSQL(sql, params);
    console.log("yes");
    console.log("temp[0]: ",temp[0]);
    dSunDefault = temp[0];
    res.locals.dSunDefault = dSunDefault;
  } else {
    res.locals.dSunDefault = null;
  } //block
  
  //add all bMonDefault etc objects into an array or object json formated and pass that in then access it from ejs way simplier than passing a million variables. Json is easy .jsonify or something like that

 //also could try to use res.locals.{variable name i think} = {something} but this wasnt working so my syntax might be off.
  
  // console.log("userCalendarRecipes: ", userCalendarRecipes);
  res.render('calendar', { "userInfo": userInfo, "data": data, "userCalendarRecipes":userCalendarRecipes});
});

app.get('/createRecipes', isAuthenticated, (req, res) => {


  res.render('createRecipes');
});



// app.post('/createRecipes', isAuthenticated,async(req, res) => {
//   let recipeName = req.body.recipeName;
//   let ingredients = req.body.ingredients;
//   let instructions = req.body.instructions;

//   let sql = `INSERT INTO mp_userrecipes
//              (accountId, recipeName, ingredients, instructions)
//              VALUES
//              ( ?, ?, ?, ?)
//              `;
//    let params = [userInfo.accountId, recipeName, ingredients, instructions];
//     let data = await executeSQL(sql, params);

//     res.render('createRecipes', { "userInfo": userInfo, "data": data });
// });



app.post('/weekRecipes', isAuthenticated, async (req, res) => {

  let bmon = req.body.bMon;
  let btue = req.body.bTue;
  let bwed = req.body.bWed;
  let bthu = req.body.bThu;
  let bfri = req.body.bFri;
  let bsat = req.body.bSat;
  let bsun = req.body.bSun;

  let lmon = req.body.lMon;
  let ltue = req.body.lTue;
  let lwed = req.body.lWed;
  let lthu = req.body.lThu;
  let lfri = req.body.lFri;
  let lsat = req.body.lSat;
  let lsun = req.body.lSun;

  let dmon = req.body.dMon;
  let dtue = req.body.dTue;
  let dwed = req.body.dWed;
  let dthu = req.body.dThu;
  let dfri = req.body.dFri;
  let dsat = req.body.dSat;
  let dsun = req.body.dSun;

  console.log("bmon_test:", bmon)
  console.log("btue_test:", btue)
  //delete all of the entires where accountId matches users id

  let userInfo = sessionStorage.getItem('userInfo');  //works?
  //console.log(userInfo)
  let sql = `DELETE
             FROM mp_mealcalendar 
             WHERE accountId = ?`;
  await executeSQL(sql, userInfo.accountId);
  //breakfast path
  //time is set for 7am
  //recipeId 
  //pull recipe from database
  //push into mp_mealCalendar for every dropdown that is not blank

  
  let current = bmon; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 05, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = btue; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 06, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = bwed; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 07, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = bthu; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 08, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = bfri; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 09, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = bsat; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 10, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = bsun; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 11, 07, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block


  
  //lunch path
  //time is set for noon
  current = lmon; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 05, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = ltue; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 06, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = lwed; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 07, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = lthu; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 08, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = lfri; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 09, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = lsat; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 10, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = lsun; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 11, 12, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

  

  //dinner path
  //time is set for 5pm
  current = dmon; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 05, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = dtue; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 06, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = dwed; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 07, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = dthu; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `UPDATE INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 08, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = dfri; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 09, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = dsat; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 10, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block

    current = dsun; //  begin block
  if (current >= 0) {
    //runs if bmond is defined
    console.log("bmond is greater or equal to 0!")
    sql = `INSERT INTO mp_mealcalendar
           (accountId, recipeId, timeSlot)
               VALUES
               (?, ?, ?)`;
    let timeSlot = new Date(2022, 11, 11, 17, 00, 00);  //YYYY-MM-DD hh:mm:ss
    console.log(timeSlot);
    let params = [userInfo.accountId, current, timeSlot];
    await executeSQL(sql, params);
  }//  end block


  
  res.redirect('/calendar')
});



app.get('/shoppingList', isAuthenticated, async (req, res) => {
  let userInfo = sessionStorage.getItem('userInfo');
  
  let sql = `SELECT ingredientList
            FROM mp_mealcalendar
            LEFT JOIN mp_userrecipes
            ON mp_mealcalendar.recipeId = mp_userrecipes.recipeId
            WHERE mp_mealcalendar.accountId = ?`;
    let param = [userInfo.accountId];
    let data = await executeSQL(sql, param);
    console.log("data_test: ", data);
  
  res.render('shoppingList', {"data": data});
});



app.get('/bmi', isAuthenticated, async (req, res) => {
  //pass in user account may not be working user to user :(
  let userInfo = sessionStorage.getItem('userInfo');
  sql = `SELECT *
             FROM mp_accounts
             WHERE accountId = ?`;
    userInfo = await executeSQL(sql, [userInfo.accountId]); userInfo = userInfo[0];

    console.log(userInfo);
    //store users account sql row in userInfo session storage
    sessionStorage.setItem("userInfo", userInfo);

  //fetch second api call
  let url = `https://fitness-calculator.p.rapidapi.com/bmi?age=${userInfo.age}&weight=${userInfo.weight * 0.4535924}&height=${userInfo.height * 2.54}`;
  // console.log(url);


  let response = await fetch(url, options);
  let data = await response.json();
  console.log(data.data);
  //pass api response back to page inside data
  


  res.render('bmi', { "data": data.data, "userInfo": userInfo });
});


app.post('/bmi', async(req, res) => {

    let userInfo = sessionStorage.getItem('userInfo');
    let age = req.body.bmiAgeBox;
    let height = req.body.bmiHeightBox;
    let weight = req.body.bmiWeightBox;

     let sql = `UPDATE mp_accounts
                SET age=${age}, height=${height}, weight=${weight} 
                WHERE accountId=${userInfo.accountId};`
    await executeSQL(sql);
  
    alert("Clicked Save");
    res.redirect('bmi');
});



app.get('/myRecipes', isAuthenticated, async (req, res) => {
   let userInfo = sessionStorage.getItem('userInfo');
   let sql = `SELECT *
              FROM mp_userrecipes
              WHERE accountId = ?
              `;
    let params = [userInfo.accountId];
    let data = await executeSQL(sql, params);
    //console.log("data_test: ", data);
  res.render('myRecipes', { "userInfo": userInfo, "data": data });
});



app.get("/dbTest", isAuthenticated, async function(req, res) {
  let sql = "SELECT CURDATE()";
  let rows = await executeSQL(sql);
  res.send(rows);
});//dbTest


//functions
async function executeSQL(sql, params) {
  return new Promise(function(resolve, reject) {
    pool.query(sql, params, function(err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
}//executeSQL



function isAuthenticated(req, res, next) {

  if (req.session.authenticated == true) {

    next();
  }

  else {

    res.redirect('/');
  }
}

//values in red must be updated
function dbConnection() {

  const pool = mysql.createPool({

    connectionLimit: 10,
    host: "t07cxyau6qg7o5nz.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "zug8kuw2w01vf8ih",
    password: "kgegtpgz9r99pmgl",
    database: "ebhhu7g0z56xpgoy"
  });

  return pool;

} //dbConnection

//start server
app.listen(3000, () => {
  console.log("Expresss server running...")
})









    // pull recipe row from database mp_recipes based on recipeId
    // sql = `SELECT *
    //          FROM mp_recipes
    //          WHERE recipeId = ?`;
    // let data = await executeSQL(sql, [current]); data = data;