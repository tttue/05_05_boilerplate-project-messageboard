/*
*
*
*       Complete the API routing below
*
*
*/

'use strict'

var expect = require('chai').expect
const database_tool = require("../tool/database_tool")
const tool = require("../tool/tool")

const timeout = 10000

module.exports = function (app) {

	app.route('/api/threads/:board')

		.get(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.getTopTenThread(board, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info);
			})
		})

		.post(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.newThread(board, req.body.text, req.body.delete_password, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})

		.put(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.reportThread(board, req.body.thread_id, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})

		.delete(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.deleteThread(board, req.body.thread_id, req.body.delete_password, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})

	app.route('/api/replies/:board')

		.get(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.getReplyOfThread(board, req.query.thread_id, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})

		.post(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.newReply(board, req.body.thread_id, req.body.text, req.body.delete_password, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})

		.put(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.reportReply(board, req.body.thread_id, req.body.reply_id, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})

		.delete(function (req, res, next) {
			let board = req.params.board
			var t = setTimeout(() => { next({ message: 'timeout' }) }, timeout)
			database_tool.deleteReply(board, req.body.thread_id, req.body.reply_id, req.body.delete_password, (err, info) => {
				clearTimeout(t)
				tool.apiProcessResult(res, next, err, info)
			})
		})
}
