var app = require('../app').app;
var should = require('should');
var request = require('supertest');
var User = require('../app/modules/users/model');
var Email = require('../app/modules/emails/model');

describe('API', function () {

  // Create an admin user
  before(function (done) {
    var salt = User.Helpers.salt();
    var admin = new User({
      email: 'admin@test.com',
      role: User.ADMIN,
      password: User.Helpers.hash('pass', salt),
      salt: salt,
      activated: true
    });
    admin.save(function (err, user) {
      if (err) throw err;
      done();
    });
  });

  describe('User and Application', function () {

    var id = '';

    it('should register a new user', function (done) {
      request(app)
        .post('/api/users/register')
        .send({
          email: 'user@test.com',
          password: 'pass'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.should.have.property('email');
          res.body.email.should.be.exactly('user@test.com');
          id = res.body._id;
          done();
        });
    });

    it('should activate the new user', function (done) {
      request(app)
        .get('/api/users/activate/' + id)
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          JSON.stringify(res.body).should.be.exactly("{}");
          done();
        });
    });

    it('should successfully check login credentials', function (done) {
      request(app)
        .post('/api/users/login')
        .send({
          email: 'user@test.com',
          password: 'pass'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.should.have.property('email');
          res.body.should.have.property('password');
          res.body.should.have.property('role');
          done();
        });
    });

    it('should tell me that the username or password is incorrect', function (done) {
      request(app)
        .post('/api/users/login')
        .send({
          email: 'user@test.com',
          password: 'wrong'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.errors[0].should.equal('Username or password incorrect');
          done();
        });
    });

    // not the best way of testing this but without email we can't do better
    it('should ask for a password reset', function (done) {
      request(app)
        .post('/api/users/password/reset/request')
        .send({
          email: 'user@test.com'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          JSON.stringify(res.body).should.be.exactly("{}");
          done();
        });
    });

    // once again not the best test but without knowing the token we must make do
    it('should fail to reset password with wrong token', function (done) {
      request(app)
        .post('/api/users/password/reset')
        .send({
          email: 'user@test.com',
          token: 'adadsdsf',
          password: 'hah hah this works'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.errors[0].should.equal('The token or email is incorrect');
          done();
        });
    });

    it('should update the user\'s role', function (done) {
      request(app)
        .post('/api/users/role/' + id)
        .auth('admin@test.com', 'pass')
        .send({
          role: 'staff'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.role.should.equal('staff');
          done();
        });
    });

    it('should submit an application for the test user', function (done) {
      request(app)
        .post('/api/application/submit')
        .auth('user@test.com', 'pass')
        .send({
          name: 'First Last',
          school: 'Ohio State University',
          phone: '5555555555',
          shirt: 'M',
          demographic: true,
          first: false,
          dietary: 'Vegetarian|Vegan',
          year: 'Junior',
          age: 19,
          gender: 'male',
          major: 'Marketing',
          conduct: true,
          travel: false,
          waiver: true
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.name.should.be.exactly('First Last');
          res.body.school.should.be.exactly('Ohio State University');
          res.body.phone.should.be.exactly('5555555555');
          res.body.shirt.should.be.exactly('M');
          res.body.demographic.should.be.exactly(true);
          res.body.first.should.be.exactly(false);
          res.body.dietary.length.should.be.exactly(2);
          res.body.year.should.be.exactly('Junior');
          res.body.age.should.be.exactly(19);
          res.body.gender.should.be.exactly('male');
          res.body.major.should.be.exactly('Marketing');
          res.body.conduct.should.be.exactly(true);
          res.body.travel.should.be.exactly(false);
          res.body.waiver.should.be.exactly(true);
          done();
        });
    });

    it('should update the created application', function (done) {
      request(app)
        .post('/api/application/update')
        .auth('user@test.com', 'pass')
        .send({
          name: 'Real Name',
          school: 'Kent State University',
          phone: '1234567890',
          shirt: 'L',
          demographic: true,
          first: true,
          year: 'Senior',
          age: 20,
          gender: 'female',
          major: 'Computer Science',
          conduct: true,
          travel: true,
          waiver: true
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.name.should.be.exactly('Real Name');
          res.body.school.should.be.exactly('Kent State University');
          res.body.phone.should.be.exactly('1234567890');
          res.body.shirt.should.be.exactly('L');
          res.body.demographic.should.be.exactly(true);
          res.body.first.should.be.exactly(true);
          res.body.year.should.be.exactly('Senior');
          res.body.age.should.be.exactly(20);
          res.body.gender.should.be.exactly('female');
          res.body.major.should.be.exactly('Computer Science');
          res.body.conduct.should.be.exactly(true);
          res.body.travel.should.be.exactly(true);
          res.body.waiver.should.be.exactly(true);
          done();
        });
    });

    it('should view the user\'s application', function (done) {
      request(app)
        .get('/api/application')
        .auth('user@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.name.should.be.exactly('Real Name');
          res.body.school.should.be.exactly('Kent State University');
          res.body.phone.should.be.exactly('1234567890');
          res.body.shirt.should.be.exactly('L');
          res.body.demographic.should.be.exactly(true);
          res.body.first.should.be.exactly(true);
          res.body.year.should.be.exactly('Senior');
          res.body.age.should.be.exactly(20);
          res.body.gender.should.be.exactly('female');
          res.body.major.should.be.exactly('Computer Science');
          res.body.conduct.should.be.exactly(true);
          res.body.travel.should.be.exactly(true);
          res.body.waiver.should.be.exactly(true);
          done();
        });
    });

    it('should update an application by user ID', function (done) {
      request(app)
        .post('/api/application/update/' + id)
        .auth('admin@test.com', 'pass')
        .send({
          status: 'approved',
          checked: true
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.application.status.should.equal('approved');
          res.body.application.checked.should.equal(true);
          done();
        });
    });

    it('should quickly register a new user', function (done) {
      request(app)
        .post('/api/application/quick')
        .auth('admin@test.com', 'pass')
        .send({
          name: 'Last Person',
          email: 'person@test.com',
          phone: '1987654321'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.email.should.equal('person@test.com');
          res.body.application.name.should.equal('Last Person');
          res.body.application.phone.should.equal('1987654321');
          done();
        });
    });

    it('should get a list of all users', function (done) {
      request(app)
        .get('/api/users')
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.users.length.should.be.above(2);
          done();
        });
    });

    it('should unsubscribe a user', function (done) {
      request(app)
        .post('/api/users/unsubscribe')
        .auth('admin@test.com', 'pass')
        .send({
          userId: id
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.subscribe.should.equal(false);
          done();
        });
    });

    it('should delete a user', function (done) {
      request(app)
        .post('/api/users/delete')
        .auth('admin@test.com', 'pass')
        .send({
          userId: id
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          JSON.stringify(res.body).should.equal("{}");
          done();
        });
    });

  });

  describe('URL Shortener', function () {

    var linkId;

    it('should create a shortened url', function (done) {
      request(app)
        .post('/api/urls/shorten')
        .auth('admin@test.com', 'pass')
        .send({
          full: 'http://www.google.com',
          short: 'google'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.full.should.equal('http://www.google.com');
          res.body.short.should.equal('google');
          linkId = res.body._id;
          done();
        });
    });

    it('should redirect to the full url', function (done) {
      request(app)
        .get('/go/google')
        .expect(302)
        .end(function (err, res) {
          if (err) throw err;
          done();
        });
    });

    it('should list the created urls', function (done) {
      request(app)
        .get('/api/urls')
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.urls.length.should.be.above(0);
          done();
        });
    });

    it('should delete the created url', function (done) {
      request(app)
        .post('/api/urls/remove')
        .auth('admin@test.com', 'pass')
        .send({
          id: linkId
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          done();
        });
    });

  });

  describe('Emails', function () {

    it('should send an email to a test user', function (done) {
      request(app)
        .post('/api/emails/send')
        .auth('admin@test.com', 'pass')
        .send({
          nickname: 'Test Group',
          subject: 'Testing',
          body: '# Header',
          recipients: {
            emails: ['person@test.com']
          }
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          JSON.stringify(res.body).should.equal('{}');
          done();
        });
    });

    it('should list all sent emails', function (done) {
      request(app)
        .get('/api/emails')
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.emails.length.should.be.above(0);
          for (var i = 0; i < res.body.emails.length; i++) {
            if (res.body.emails[i].recipients.nickname == 'Test Group') {
              res.body.emails[i].subject.should.equal('Testing');
              res.body.emails[i].body.should.equal('# Header');
              break;
            }
          }
          done();
        });
    });

  });

  describe('Live Feed', function () {

    var messageId;

    it('should create a new message', function (done) {
      request(app)
        .post('/api/messages')
        .auth('admin@test.com', 'pass')
        .send({text: 'Hello, world'})
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.should.have.property('created');
          res.body.should.have.property('_id');
          res.body.text.should.equal('Hello, world');
          messageId = res.body._id;
          done();
        });
    });

    it('should get a list of messages', function (done) {
      request(app)
        .get('/api/messages')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.should.have.property('messages');
          res.body.messages.length.should.be.above(0);
          res.body.messages[0].should.have.property('created');
          res.body.messages[0].should.have.property('text');
          res.body.messages[0].should.have.property('_id');
          done();
        });
    });

    it('should get a single message', function (done) {
      request(app)
        .get('/api/messages/'+messageId)
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.should.have.property('created');
          res.body._id.should.equal(messageId);
          res.body.text.should.equal('Hello, world');
          done();
        });
    });

    it('should delete a message', function (done) {
      request(app)
        .delete('/api/messages/'+messageId)
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          JSON.stringify(res.body).should.equal('{}');
          done();
        });
    });

  });

  describe('Tickets', function () {

    var ticketId;

    it('should create a new ticket', function (done) {
      request(app)
        .post('/api/tickets')
        .send({
          subject: 'Test Ticket',
          body: 'This is a test',
          replyTo: 'person@test.com'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.subject.should.equal('Test Ticket');
          res.body.body.should.equal('This is a test');
          res.body.replyTo.should.equal('person@test.com');
          res.body.open.should.equal(true);
          res.body.inProgress.should.equal(false);
          res.body.should.have.property('_id');
          res.body.should.have.property('created');
          ticketId = res.body._id;
          done();
        });
    });

    it('should get a list of tickets', function (done) {
      request(app)
        .get('/api/tickets')
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.tickets.length.should.be.above(0);
          res.body.tickets[0].should.have.property('_id');
          res.body.tickets[0].should.have.property('created');
          res.body.tickets[0].should.have.property('subject');
          res.body.tickets[0].should.have.property('body');
          res.body.tickets[0].should.have.property('replyTo');
          res.body.tickets[0].should.have.property('open');
          res.body.tickets[0].should.have.property('inProgress');
          done();
        });
    });

    it('should get a single ticket by id', function (done) {
      request(app)
        .get('/api/tickets/'+ticketId)
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.subject.should.equal('Test Ticket');
          res.body.body.should.equal('This is a test');
          res.body.replyTo.should.equal('person@test.com');
          res.body.open.should.equal(true);
          res.body.inProgress.should.equal(false);
          res.body.should.have.property('_id');
          res.body.should.have.property('created');
          done();
        });
    });

    it('should update a ticket', function (done) {
      request(app)
        .patch('/api/tickets/'+ticketId)
        .auth('admin@test.com', 'pass')
        .send({
          open: false,
          inProgress: true
        })
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          res.body.subject.should.equal('Test Ticket');
          res.body.body.should.equal('This is a test');
          res.body.replyTo.should.equal('person@test.com');
          res.body.open.should.equal(false);
          res.body.inProgress.should.equal(true);
          res.body.should.have.property('_id');
          res.body.should.have.property('created');
          done();
        });
    });

    it('should delete a ticket', function (done) {
      request(app)
        .delete('/api/tickets/'+ticketId)
        .auth('admin@test.com', 'pass')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          done();
        });
    });

  });

  // Remove all test users
  after(function (done) {
    User.remove({email: 'admin@test.com'}, function (err) {
      if (err) throw err;
      User.remove({email: 'person@test.com'}, function (err) {
        if (err) throw err;
        Email.remove({nickname: 'Test Group'}, function (err) {
          if (err) throw err;
          done();
        });
      });
    });
  });

});