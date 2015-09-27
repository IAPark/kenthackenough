'use strict';

var router = getRouter();
var socket = rootRequire('app/helpers/socket');
var io = socket('/tickets', ['admin', 'staff']);
var Ticket = require('./model');
var User = require('../users/model');

/**
* Create a new ticket
* POST /tickets
*/
router.post('/tickets', function (req, res) {
  var errors = Ticket.validate(req.body);
  if (errors.length) return res.multiError(errors);
  var ticket = new Ticket(req.body);
  ticket.save(function (err, ticket) {
    if (err) return res.internalError();
    io.emit('create', ticket);
    return res.json(ticket);
  });
});

/**
* Get a list of tickets
* GET /tickets
* Auth -> admin, staff
*/
router.get('/tickets', User.auth('admin', 'staff'), function (req, res) {
  Ticket
    .find()
    .exec(function (err, tickets) {
      if (err) return res.internalError();
      return res.json({tickets: tickets});
    });
});

/**
* Get a ticket by ID
* GET /tickets/:id
* Auth -> admin, staff
*/
router.get('/tickets/:id', User.auth('admin', 'staff'), function (req, res) {
  Ticket
    .findById(req.params.id)
    .exec(function (err, ticket) {
      if (err) return res.internalError();
      return res.json(ticket);
    });
});

/**
* Partially update a ticket
* PATCH /tickets/:id
* Auth -> admin, staff
*/
router.patch('/tickets/:id', User.auth('admin', 'staff'), function (req, res) {
  if (req.user && req.user.email) req.body.worker = req.user.email;
  Ticket
    .findByIdAndUpdate(req.params.id, req.body, {new: true})
    .exec(function (err, ticket) {
      if (err) return res.internalError();
      io.emit('update', ticket);
      return res.json(ticket);
    });
});

/**
* Delete a ticket
* Auth -> admin, staff
*/
router.delete('/tickets/:id', function (req, res) {
  Ticket
    .findByIdAndRemove(req.params.id)
    .exec(function (err, ticket) {
      if (err) return res.internalError();
      var response = {
        _id: ticket._id
      };
      io.emit('delete', response);
      return res.json(response);
    });
});