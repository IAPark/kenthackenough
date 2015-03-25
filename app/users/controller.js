var router = getRouter();
var socket = rootRequire('app/helpers/socket');
var io = socket('/users', ['admin', 'staff']);
var User = require('./model');
var Application = require('./application/model');
var schema = require('validate');

/**
* Create a new user
* POST /users
*/
router.post('/users', function (req, res) {
  var errors = User.validate(req.body);
  if (errors.length) return res.multiError(errors);

  var salt = User.Helpers.salt();
  var token = User.Helpers.token();

  var user = new User({
    email: req.body.email,
    password: User.Helpers.hash(req.body.password, salt),
    salt: salt,
    token: token,
    created: Date.now()
  });

  user.save(function (err, user) {
    if (err) return res.singleError('That email is already in use');

    if (process.env.NODE_ENV == 'production') {
      sendRegistrationEmail(user.email);
    }

    io.emit('create', {
      _id: user._id,
      email: user.email
    });

    return res.json({
      key: user._id,
      token: user.token,
      role: user.role
    });
  });
});

/**
* Quickly create a fully applied user (for registering at the door)
* POST /users/quick
* Auth -> admin, staff
*/
router.post('/users/quick', User.auth('admin', 'staff'), function (req, res) {
  var test = schema({
    email: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
    },
    phone: {
      type: 'string',
      required: true
    }
  });
  var errors = test.validate(req.body);
  if (errors.length) return res.multiError(errors);
  var application = new Application({
    name: req.body.name,
    phone: req.body.phone,
    door: true,
    going: true,
    status: Application.Status.APPROVED,
    checked: true,
    created: Date.now()
  });
  application.save(function (err, app) {
    if (err) return res.internalError();

    var salt = User.Helpers.salt();
    var pass = User.Helpers.salt();
    var user = new User({
      email: req.body.email,
      password: User.Helpers.hash(pass, salt),
      salt: salt,
      created: Date.now(),
      application: app._id,
      role: 'attendee'
    });
    user.save(function (err, user) {
      if (err) return res.singleError('That email is already in use');

      if (process.env.NODE_ENV == 'production') {
        sendRegistrationEmail(user.email);
      }

      var response = {
        _id: user._id,
        email: user.email,
        role: user.role,
        created: user.created,
        application: app
      };
      io.emit('create', response);
      return res.json(response);
    });

  });
});

/**
* Get a key and token
* POST /users/token
*/
router.post('/users/token', function (req, res) {
  User
    .findOne()
    .where({email: req.body.email})
    .exec(function (err, user) {
      if (err || !user) return res.singleError('Email or password incorrect');

      if (User.Helpers.checkPassword(user.password, req.body.password, user.salt)) {
        if (user.token) {
          return res.json({
            key: user._id,
            token: user.token,
            role: user.role
          });
        } else {
          var token = User.Helpers.token();
          user.token = token;
          user.save(function (err, user) {
            User.Helpers.cache(user);
            return res.json({
              key: user._id,
              token: user.token,
              role: user.role
            });
          });
        }
      } else {
        return res.singleError('Email or password incorrect');
      }
    });
});

/**
* Remove a token
* DELETE /users/token
* Auth
*/
router.delete('/users/token', User.auth(), function (req, res) {
  User
    .findById(req.user._id)
    .exec(function (err, user) {
      if (err || !user) return res.internalError();
      user.token = null;
      user.save(function (err, user) {
        if (err) return res.internalError();
        User.Helpers.uncache(user, function () {
          return res.json({});
        });
      });
    });
});

/**
* Get a list of all users
* GET /users
* Auth -> admin, staff
*/
router.get('/users', User.auth('admin', 'staff'), function (req, res) {
  User
    .find()
    .exec(function (err, users) {
      if (err) return res.internalError();
      return res.json({
        users: users
      });
    });
});

/**
* Get a user by ID
* GET /users/:id
* Auth -> admin, staff
*/
router.get('/users/:id', User.auth('admin', 'staff'), function (req, res) {
  User
    .findById(req.params.id)
    .select('email role created')
    .exec(function (err, user) {
      if (err) return res.internalError();
      return res.json(user);
    });
});

/**
* Partially update the logged in user
* PATCH /users
* Auth
*/
router.patch('/users', User.auth(), function (req, res) {
  User
    .findById(req.user._id)
    .exec(function (err, user) {
      if (err) return res.internalError();
      if (req.body.email) {
        user.email = req.body.email;
      }
      if (req.body.password) {
        user.salt = User.Helpers.salt();
        user.password = User.Helpers.hash(req.body.password, user.salt);
      }
      user.save(function (err) {
        if (err) return res.singleError('That email is already taken');
        var response = {
          _id: user._id,
          email: user.email
        };
        io.emit('update', response);
        return res.json(response);
      });
    });
});

/**
* Partially update a user by ID
* PATCH /users/:id
* Auth -> admin
*/
router.patch('/users/:id', User.auth('admin'), function (req, res) {
  User
    .findByIdAndUpdate(req.params.id, req.body)
    .exec(function (err, user) {
      if (err) return res.internalError();
      var response = {
        _id: user._id,
        email: user.email,
        role: user.role,
        created: user.created
      };
      io.emit('update', response);
      return res.json(response);
    });
});

/**
* Delete a user
* DELETE /users/:id
* Auth -> admin
*/
router.delete('/users/:id', User.auth('admin'), function (req, res) {
  User
    .findById(req.params.id)
    .remove()
    .exec(function (err) {
      if (err) return res.internalError();
      var response = {
        _id: req.params.id
      };
      io.emit('delete', response);
      return res.json(response);
    });
});