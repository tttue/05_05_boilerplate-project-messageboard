/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');
let link_thread = "/api/threads/for_func_test"
let link_reply = "/api/replies/for_func_test"
let thread_pasword = "thread_pasword"
let reply_pasword = "reply_pasword"
let thread_id = undefined
let reply_id = undefined
const timeout = 10000
chai.use(chaiHttp);

suite('Functional Tests', function () {

	suite('API ROUTING FOR /api/threads/:board', function () {

		suite('POST', function () {
			this.timeout(timeout)
			test('Create thread', function (done) {
				chai.request(server)
					.post(link_thread)
					.send({ text: "Thread11", delete_password: thread_pasword })
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.property(res.body, "text")
						assert.property(res.body, "created_on")
						assert.property(res.body, "bumped_on")
						thread_id = res.body._id
						done()
					})
			})
		});

		suite('PUT', function () {
			this.timeout(timeout)
			test('Report thread', function (done) {
				chai.request(server)
					.put(link_thread)
					.send({ thread_id: thread_id })
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.equal(res.text, "success")
						done()
					})
			})

		});

		suite('GET', function () {
			this.timeout(timeout)
			test('Get thread', function (done) {
				chai.request(server)
					.get(link_thread)
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.isArray(res.body)
						assert.property(res.body[0], "text")
						assert.property(res.body[0], "created_on")
						assert.property(res.body[0], "bumped_on")
						assert.isArray(res.body[0].replies)
						done()
					})
			})

		});

	});

	suite('API ROUTING FOR /api/replies/:board', function () {

		suite('POST', function () {
			this.timeout(timeout)
			test('New reply', function (done) {
				chai.request(server)
					.post(link_reply)
					.send({ thread_id: thread_id, text: "Reply 1", delete_password: reply_pasword })
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.property(res.body, "text")
						assert.property(res.body, "created_on")
						reply_id = res.body._id
						done()
					})
			})
		});

		suite('PUT', function () {
			this.timeout(timeout)
			test('Report reply', function (done) {
				chai.request(server)
					.put(link_reply)
					.send({ thread_id: thread_id, reply_id: reply_id })
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.equal(res.text, "success")
						done()
					})
			})
		});

		suite('GET', function () {
			this.timeout(timeout)
			test('Get reply in thread', function (done) {
				chai.request(server)
					.get(link_reply + "?thread_id=" + thread_id)
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.property(res.body, "text")
						assert.property(res.body, "created_on")
						assert.property(res.body, "bumped_on")
						assert.isArray(res.body.replies)
						assert.equal(res.body.replies[0]._id, reply_id)

						done()
					})
			})
		});
	});

	suite('Delete', function () {
		suite('DELETE reply', function () {
			this.timeout(timeout)
			test('DELETE reply with wrong password', function (done) {
				chai.request(server)
					.delete(link_reply)
					.send({ thread_id: thread_id, reply_id: reply_id, delete_password: reply_pasword + "nothing" })
					.end(function (err, res) {
						assert.equal(res.status, 200)
						assert.equal(res.text, "incorrect password")
						done()
					})
			});

			test('DELETE reply with correct password', function (done) {
				this.timeout(timeout)
				chai.request(server)
					.delete(link_reply)
					.send({ thread_id: thread_id, reply_id: reply_id, delete_password: reply_pasword})
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.equal(res.text, "success")
						done()
					})
			});

			test('Check DELETE reply', function (done) {
				chai.request(server)
					.get(link_reply + "?thread_id=" + thread_id)
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.property(res.body, "text")
						assert.property(res.body, "created_on")
						assert.property(res.body, "bumped_on")
						assert.isArray(res.body.replies)
						assert.equal(res.body.replies[0]._id, reply_id)
						assert.equal(res.body.replies[0].text, "[deleted]")

						done()
					})
			});

		})


		suite('DELETE thread', function (done) {
			this.timeout(timeout)
			test('Delete thread with wrong password', function (done) {
				chai.request(server)
					.delete(link_thread)
					.send({ thread_id: thread_id, delete_password: thread_pasword + "nothing" })
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.equal(res.text, "incorrect password")
						done()
					})
			})

			test('Delete thread with correct password', function (done) {
				chai.request(server)
					.delete(link_thread)
					.send({ thread_id: thread_id, delete_password: thread_pasword })
					.end(function (err, res) {

						assert.equal(res.status, 200)
						assert.equal(res.text, "success")
						done()
					})
			})
		});
	})
});
