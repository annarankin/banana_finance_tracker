var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var app = express();
var port = process.env.PORT || 3000;

// --------- MONGOOO ---------

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var mongoUrl = 'mongodb://localhost:27017/finance'
var db;
MongoClient.connect(mongoUrl, function(err, database) {
  if (err) {
    console.log(err)
  }
  db = database;
  process.on('exit', db.close);
});

//-------- Passport - facebook auth -------------

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the FacebookStrategy within Passport.
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Look for user in DB by FB id
      db.collection('users').findOne({_id: profile.id}, function(err, data){
        if (err) { console.log(err); 
        } else if (!data) {
          var user = {};
          user._id = profile.id;
          user.name = profile.name.givenName;
          user.gender = profile.gender;
          db.collection('users').insert(user, function(err, data) {
            return done(null, user);
          });
        } else {
          return done(null, data);
        }
      })

    });
  }
));

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');


// Checking 
app.use(cookieParser());
app.use(bodyParser());
app.use(bodyParser.json());
app.use(session({ 
  secret: 'keyboard cat',
  store: new MongoStore({url: mongoUrl})
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  console.log(req.method, req.url, '\n body:', req.body);
  next();
});

app.get('/', ensureAuthenticated, function(req, res) {
  res.render('index', {user: req.user});
});

app.get('/login', function(req, res) {
  res.render('login')
});


// ------- FB AUTH ROUTES -------

app.get('/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// --------- API ROUTES ---------
// Must be logged in to hit successfully

app.post('/api/bills', function(req, res) {

  var bill = {};
  bill.name = req.body.bill_name;
  bill.amount = req.body.amount;
  bill.dueDate = req.body.due_date;

  db.collection('users').update({_id: req.user._id}, {$push: { bills: bill}}, function(err, data) {
    if (err) { 
      return res.json({error: err});
    }
    res.json(bill);
  })
})

app.get('/api/bills', function(req, res) {
  db.collection('users').findOne({_id: req.user._id}, function(err, data) {
    res.json(data.bills);
  });
});






app.listen(port, function() {
  console.log('Listening in on port', port, '!');
});



// From passport-facebook example - makes sure user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}