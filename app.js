var express = require('express');
var http = require('http');
var morgan = require('morgan');
var passport = require('passport');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var GitHubStrategy = require('passport-github2').Strategy;

var handlebars  = require('express-handlebars').create({defaultLayout:'layout'});

var mongoose = require('mongoose');
// 1. add data from db
// mongoose.connect('mongodb://<dbuser>:<dbpassword>...');

var User = mongoose.Schema({
    username: String,
    date: { type: Date, default: Date.now }
});
var githubUser = mongoose.model('users', User);

// 2. add data from github
// var GITHUB_CLIENT_ID = "your-client-id";
// var GITHUB_CLIENT_SECRET = "your-client-secret";

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    // На гитхабе в приложении должна быть идентичная ссылка
    callbackURL: "http://localhost:8080/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {

      return done(null, profile);
    });
  }
));

var app = express();

// configure Express
app.use(morgan('short'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: 'secret', saveUninitialized: true, resave: true }));
app.set('views', __dirname + '/views');
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){

	var addGithubUser = new githubUser({ 
		username: req.user.username,
		date: new Date
	});

	addGithubUser.save(function (err) {
	  if (err) { console.log(err); } 
	  else { console.log('данные загружены в базу'); }
	});

  res.render('account', { user: req.user, email: req.user._json.email });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
  });

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'), function() {
	console.log('Express запущен на http://localhost:' + 
		app.get('port') + ': нажмите CTRL+C для завершения');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
