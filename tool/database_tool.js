/*
	promiseForeach multi promise with fetch data from url

	moongoose - find, distinct, count
 */
const promiseForeach = require('promise-foreach')
const fetch = require("node-fetch")
const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(process.cwd(), 'private.env') })
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true })
mongoose.set('useCreateIndex', true);
const tool = require("./tool")

const threadSchema = new mongoose.Schema({
	board: String,
	text: String,
	created_on: Date,
	bumped_on: Date,
	reported: Number,// Boolean
	delete_password: String,
})
threadSchema.index({ board: 1 })

const Thread = mongoose.model('Thread', threadSchema)
Thread.ensureIndexes()
const replySchema = new mongoose.Schema({
	board: String,
	threadId: String,
	text: String,
	created_on: Date,
	reported: Number,// Boolean
	delete_password: String,
})
replySchema.index({ board: 1 })
replySchema.index({ threadId: 1 })

const Reply = mongoose.model('Reply', replySchema)

function cloneThread(thread) {
	return {
		_id: thread._id,
		board: thread.board,
		text: thread.text,
		created_on: thread.created_on,
		bumped_on: thread.bumped_on,
		replies: [],
		replycount: 0
	}
}

function cloneReply(reply) {
	return {
		_id: reply._id,
		board: reply.board,
		threadId: reply.threadId,
		text: reply.text,
		created_on: reply.created_on,
	}
}

const newThread = (board, text, delete_password, done) => {
	let checkParamList = [
		{ param: text, checkFunc: tool.checkStringNotBlank, paramName: "text" },
		{ param: delete_password, checkFunc: tool.checkStringNotBlank, paramName: "delete_password" }
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}

	let currentTime = new Date()
	let objThread = {
		board: board,
		text: text,
		created_on: currentTime,
		bumped_on: currentTime,
		reported: 0,
		delete_password: delete_password
	}
	let thread = new Thread(objThread)
	thread.save((err, data) => {
		if (err) {
			done(err)
			return
		}
		let ret = cloneThread(data)
		done(null, { errorCode: 0, data: ret })
	})
}

const reportThread = (board, threadId, done) => {
	let checkParamList = [
		{ param: threadId, checkFunc: tool.checkId, paramName: "threadId", isNotBlank: true }
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}
	Thread.findById(threadId, (err, data) => {
		if (err) {
			done(err)
			return
		}
		if (!data) {
			done(null, { errorCode: -2, errorMsg: "Thread _id=" + threadId + " is not found " })
			return
		}
		if (data.board !== board) {
			done(null, { errorCode: -2, errorMsg: "Board is not match : thread.board=" + data.board })
			return
		}
		data.reported = 1
		data.save((err, data) => {
			if (err) {
				done(err)
				return
			}
			done(null, { errorCode: 0, message: "success" })
		})

	})
}

const deleteThread = (board, threadId, delete_password, done) => {
	let checkParamList = [
		{ param: threadId, checkFunc: tool.checkId, paramName: "threadId", isNotBlank: true },
		{ param: delete_password, checkFunc: tool.checkStringNotBlank, paramName: "delete_password" }
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}

	Thread.findById(threadId, (err, data) => {
		if (err) {
			done(err)
			return
		}
		if (!data) {
			done(null, { errorCode: -2, errorMsg: "Thread _id=" + threadId + " is not found " })
			return
		}
		if (data.board !== board) {
			done(null, { errorCode: -2, errorMsg: "Board is not match :" + data.board })
			return
		}
		if (data.delete_password !== delete_password) {
			done(null, { errorCode: 0, message: "incorrect password" })
			return
		}

		Promise.all([
			Reply.deleteMany({ board: board, threadId: threadId }),
			Thread.findByIdAndDelete(threadId)])
			.then(result => {
				done(null, { errorCode: 0, message: "sucess" })
			})
			.catch(err => {
				if (err) {
					done(err)
					return
				}
			})

	})
}

const newReply = (board, threadId, text, delete_password, done) => {
	let checkParamList = [
		{ param: text, checkFunc: tool.checkStringNotBlank, paramName: "text" },
		{ param: threadId, checkFunc: tool.checkId, paramName: "threadId", isNotBlank: true },
		{ param: delete_password, checkFunc: tool.checkStringNotBlank, paramName: "delete_password" }
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}

	let currentTime = new Date()
	Thread.findById(threadId, (err, data) => {
		if (err) {
			done(err)
			return
		}
		if (!data) {
			done(null, { errorCode: -2, errorMsg: "Thread _id=" + threadId + " is not found " })
			return
		}
		if (data.board !== board) {
			done(null, { errorCode: -2, errorMsg: "Board is not match :" + data.board })
			return
		}
		data.bumped_on = currentTime
		data.save(err, data => {
			let replyObj = {
				board: board,
				threadId: threadId,
				text: text,
				created_on: currentTime,
				reported: 0,
				delete_password: delete_password
			}
			let reply = new Reply(replyObj)
			reply.save((err, data) => {
				if (err) {
					done(err)
					return
				}
				let ret = cloneReply(data)

				done(null, { errorCode: 0, data: ret })
			})
		})
	})
}

const reportReply = (board, threadId, replyId, done) => {
	let checkParamList = [
		{ param: threadId, checkFunc: tool.checkId, paramName: "threadId", isNotBlank: true },
		{ param: replyId, checkFunc: tool.checkId, paramName: "replyId", isNotBlank: true },
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}

	Promise.all([Thread.findById(threadId), Reply.findById(replyId)]
	).then(result => {
		let thread = result[0]
		let reply = result[1]
		if (!thread) {
			done(null, { errorCode: -2, errorMsg: "Thread _id=" + threadId + " is not found " })
			return
		}

		if (!reply) {
			done(null, { errorCode: -2, errorMsg: "Reply _id=" + replyId + " is not found" })
			return
		}

		if (thread.board !== board || reply.board !== board) {
			done(null, { errorCode: -2, errorMsg: "Board is not match, thread.board=" + thread.board + ", reply.board=" + reply.board + ", board=" + board })
			return
		}
		if (thread._id != reply.threadId) {
			done(null, { errorCode: -2, errorMsg: "Thread Id is not match, thread.id=" + thread._id + ", reply.threadId=" + reply.threadId })
			return
		}

		reply.reported=1
		reply.save((err,data)=>{
			if (err) {
				done(err)
				return
			}
			done(null, { errorCode: 0, message: "success" })
		})
	}).catch(err => done(err))
}

const deleteReply = (board, threadId, replyId, delete_password, done) => {
	let checkParamList = [
		{ param: replyId, checkFunc: tool.checkId, paramName: "replyId", isNotBlank: true },
		{ param: threadId, checkFunc: tool.checkId, paramName: "threadId", isNotBlank: true },
		{ param: delete_password, checkFunc: tool.checkStringNotBlank, paramName: "delete_password" }
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}

	Promise.all([Thread.findById(threadId), Reply.findById(replyId)]
	).then(result => {
		let thread = result[0]
		let reply = result[1]
		if (!thread) {
			done(null, { errorCode: -2, errorMsg: "Thread _id=" + threadId + " is not found " })
			return
		}

		if (!reply) {
			done(null, { errorCode: -2, errorMsg: "Reply _id=" + replyId + " is not found" })
			return
		}

		if (thread.board !== board || reply.board !== board) {
			done(null, { errorCode: -2, errorMsg: "Board is not match, thread.board=" + thread.board + ", reply.board=" + reply.board + ", board=" + board })
			return
		}
		if (thread._id != reply.threadId) {
			done(null, { errorCode: -2, errorMsg: "Thread Id is not match, thread.id=" + thread._id + ", reply.threadId=" + reply.threadId })
			return
		}
		if (reply.delete_password !== delete_password) {
			done(null, { errorCode: 0, message: "incorrect password" })
			return
		}
		reply.text = "[deleted]"
		reply.save((err, data) => {
			if (err) {
				done(err)
				return
			}
			done(null, { errorCode: 0, message: "success" })
		})
	}).catch(err => done(err))

}

const getReplyOfThread = (board, threadId, done) => {
	let checkParamList = [
		{ param: threadId, checkFunc: tool.checkId, paramName: "threadId", isNotBlank: true }
	]
	if (!tool.checkParams(checkParamList, done)) {
		return
	}
	Thread.findById(threadId, (err, thread) => {
		if (err) {
			done(err)
			return
		}
		if (!thread) {
			done(null, { errorCode: -2, errorMsg: "Thread _id=" + threadId + " is not found " })
			return
		}
		if (thread.board !== board) {
			done(null, { errorCode: -2, errorMsg: "Board is not match : thread.board=" + thread.board })
			return
		}
		let ret = cloneThread(thread)
		Reply.find({ board: board, threadId: threadId }).sort({ created_on: -1 }).exec((err, datas) => {
			if (err) {
				done(err)
				return
			}
			let newList = datas.map(elm => {
				let retReply = cloneReply(elm)
				return retReply
			})
			ret.replies = newList
			ret.replycount = newList.length
			done(null, { errorCode: 0, data: ret })
		})
	})
}

const getTopTenThread = (board, done) => {
	Thread.find({ board: board }).sort({ bumped_on: -1 }).limit(10).exec((err, listThread) => {
		if (err) {
			done(err)
			return
		}

		let retThread = listThread.map(elm => {
			let ret = cloneThread(elm)
			return ret
		})
		promiseForeach.each(retThread, [
			(elm) => {
				return Reply.find({ board: board, threadId: elm._id }).sort({ created_on: -1 }).limit(3)
			}
		], (arrResult, elm) => {
			elm.replies = arrResult[0].map(item => {
				let retReply = cloneReply(item)
				return retReply
			})
			return elm
		}, (err, newList) => {
			if (err) {
				done(err)
				return
			}

			done(null, { errorCode: 0, data: newList })
		}) // promiseForeach
	}) //Thread.find
}

exports.newThread = newThread
exports.reportThread = reportThread
exports.deleteThread = deleteThread
exports.newReply = newReply
exports.reportReply = reportReply
exports.deleteReply = deleteReply
exports.getReplyOfThread = getReplyOfThread
exports.getTopTenThread = getTopTenThread