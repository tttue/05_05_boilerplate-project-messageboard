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
const tool = require("./tool")
const stock = require("./stock")
const request = require('request')

const likeStockSchema = new mongoose.Schema({
	stock: String,
	ip: String
})
likeStockSchema.index({ stock: 1 })
likeStockSchema.index({ ip: 1 })

const LikeStock = mongoose.model('LikeStock', likeStockSchema)



const getOneStock = (stockName, done) => {
	var checkResult = tool.checkStringNotBlank(stockName, "stock", true)
	if (checkResult) {
		done(null, { errorCode: -2, errorMsg: checkResult })
		return
	}
	stock.getStockInfo(stockName, (err, data) => {
		if (err) {
			done(err)
			return
		}
		if (tool.isEmpty(data)) {
			done(null, { errorCode: 1, errorMsg: stockName + ": This stock doesn't exists" })
			return
		}
		LikeStock.countDocuments({ stock: data.symbol }, (err, count) => {
			let stockObj = {
				stock: data.symbol,
				price: data.profile.price,
				likes: count
			}
			done(null, { errorCode: 0, data: { stockData: stockObj } })
		})
	})
}

const getManyStock = (stockNames, done) => {
	// Accept 2 stock only
	stockNames = stockNames.slice(0, 2)
	for (var elm of stockNames) {
		var checkResult = tool.checkStringNotBlank(elm, "stock", true)
		if (checkResult) {
			done(null, { errorCode: -2, errorMsg: checkResult })
			return
		}
	}

	var arrStock = stockNames.map(elm => {
		return {
			stock: elm,
			url: 'https://financialmodelingprep.com/api/v3/company/profile/' + elm
		}
	})

	promiseForeach.each(arrStock, [(elm) => {
		return fetch(elm.url).then(response => response.json())
	}, (elm) => {
		return LikeStock.countDocuments({ stock: elm.stock })
	}], (arrResult, elm) => {
		elm.result = arrResult[0]
		elm.count = arrResult[1]
		return elm
	}, (err, newList) => {
		if (err) {
			done(err)
		}
		let stockInfoList = []
		for (var elm of newList) {
			if (tool.isEmpty(elm.result)) {
				done(null, { errorCode: -1, errorMsg: elm.stock + ": This stock doesn't exists" })
				return
			}
			stockInfoList.push({
				stock: elm.result.symbol,
				price: elm.result.profile.price,
				likes: elm.count
			})
		}
		// Count different like
		let dif = stockInfoList[0].likes - stockInfoList[1].likes
		stockInfoList[0].rel_likes = dif
		stockInfoList[1].rel_likes = 0 - dif
		delete stockInfoList[0].likes
		delete stockInfoList[1].likes
		done(null, { errorCode: 0, data: { stockData: stockInfoList } })
	})

}

/**
 * Add like in one stock
 * @param string stockName
 * @param string ip
 * @param callback done
 */
const addLike = (stockName, ip, done) => {
	var checkResult = tool.checkStringNotBlank(stockName, "stock", true)
	if (checkResult) {
		done(null, { errorCode: -2, errorMsg: checkResult })
		return
	}
	stock.getStockInfo(stockName, (err, dataStock) => {
		if (err) {
			done(err)
			return
		}
		if (tool.isEmpty(dataStock)) {
			done(null, { errorCode: 1, errorMsg: stockName + ": This stock doesn't exists" })
			return
		}
		LikeStock.countDocuments({ stock: dataStock.symbol, ip: ip }, (err, count) => {
			if (err) {
				done(err)
				return
			}
			if (count > 0) {
				getOneStock(stockName, done)
				return
			} else {
				let likeStockObj = {
					stock: dataStock.symbol,
					ip: ip
				}
				var like = new LikeStock(likeStockObj)
				like.save((err, data) => {
					if (err) {
						done(err)
						return
					}
					getOneStock(data.stock, done)
					return
				})
			}
		})
	})
}

/**
 * Add line in multi stocks
 * @param Array stockNames
 * @param string ip
 * @param callback done
 */
const addMultiStockLike = (stockNames, ip, done) => {
	// Accept 2 stock only
	stockNames = stockNames.slice(0, 2)
	for (var elm of stockNames) {
		var checkResult = tool.checkStringNotBlank(elm, "stock", true)
		if (checkResult) {
			done(null, { errorCode: -2, errorMsg: checkResult })
			return
		}
	}
	var arrStock = stockNames.map(elm => {
		return {
			stock: elm,
			url: 'https://financialmodelingprep.com/api/v3/company/profile/' + elm
		}
	})

	// Query stock and count like
	promiseForeach.each(arrStock, [(elm) => {
		return fetch(elm.url).then(response => response.json())
	}, (elm) => {
		return LikeStock.countDocuments({ stock: elm.stock, ip: ip })
	}], (arrResult, elm) => {
		elm.result = arrResult[0]
		elm.count = arrResult[1]
		return elm
	}, (err, newList) => {
		if (err) {
			done(err)
			return
		}
		let stockInfoList = []
		for (var elm of newList) {
			// not invalid stock
			if (tool.isEmpty(elm.result)) {
				done(null, { errorCode: -1, errorMsg: elm.stock + ": This stock doesn't exists" })
				return
			}
			stockInfoList.push({
				stock: elm.result.symbol,
				price: elm.result.profile.price,
				count: elm.count
			})
		}
		var promiseArr = []
		stockInfoList.forEach(elm => {
			// Create save like with no like by current ip
			if (elm.count === 0) {
				let likeStockObj = {
					stock: elm.stock,
					ip: ip
				}
				var like = new LikeStock(likeStockObj)
				promiseArr.push(like.save())
			}
		})
		// Execute save like
		Promise.all(promiseArr).then((result) => {
			promiseForeach.each(stockInfoList, [elm => {
				return LikeStock.countDocuments({ stock: elm.stock })
			}], (arrResult, elm) => {
				elm.likes = arrResult[0]
				return elm
			}, (err, newList) => {
				if (err) {
					done(err)
					return
				}
				// Count different like
				let dif = newList[0].likes - newList[1].likes
				newList[0].rel_likes = dif
				newList[1].rel_likes = 0 - dif
				delete newList[0].likes
				delete newList[1].likes
				delete newList[0].count
				delete newList[1].count
				done(null, { errorCode: 0, data: { stockData: newList } })

			})
		}).catch(err => done(err))
	})
}


const deleteLikeData = (stockNames, ip, done) => {
	for (var elm of stockNames) {
		var checkResult = tool.checkStringNotBlank(elm, "stock", true)
		if (checkResult) {
			done(null, { errorCode: -2, errorMsg: checkResult })
			return
		}
	}
	let promiseArr = []
	for (var elm of stockNames) {
		promiseArr.push(LikeStock.deleteMany({ stock: elm, ip: ip }))
	}
	Promise.all(promiseArr).then(result => {
		done(null, { errorCode: 0, message: "Delete succesful" })
	}).catch(err => {
		done(err)
	})
}
exports.getOneStock = getOneStock
exports.getManyStock = getManyStock
exports.addLike = addLike
exports.addMultiStockLike = addMultiStockLike
exports.deleteLikeData = deleteLikeData