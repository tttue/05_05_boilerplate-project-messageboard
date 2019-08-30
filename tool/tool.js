function checkStringNotBlank(data, name = "Param") {
	if (!data || /^\s+$/.test(data)) {
		return name + " must be not blank";
	}
	return null;
}

function checkNumber(data, name = "Param", isNotBlank = false) {
	if (isNotBlank){
		var result = checkStringNotBlank(data,name);
		if (result){
			return result;
		}
	}
	let checkNumberS = /^[0-9]*$/;

	if (!data) {
		return null;
	} else if (!checkNumberS.test(data)) {
		return name + ": wrong number format";
	}
	return null;
}

function checkDate(data, name = "Param", isNotBlank = false) {
	if (isNotBlank){
		var result = checkStringNotBlank(data,name);
		if (result){
			return result;
		}
	}

	let checkDateS = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

	if (!data) {
		return null;
	} else if (!checkDateS.test(data)) {
		return name + ": wrong date format";
	} else if (isNaN((new Date(data)).getTime())) {
		return name + ": Invalid Date";
	}

	return null;
}

function checkId(id, name="Param", isNotBlank = false){
	if (isNotBlank){
		var result = checkStringNotBlank(id,name);
		if (result){
			return result;
		}
	}
	var testId = /^[0-9a-f]{24}$/
	if (!id) {
		return null;
	} else if (!testId.test(id)) {
		result = "_id=" + id + " is not valid";
		return result;
	}

	return null;
}

function isEmpty(obj) {
	for(var key in obj) {
			if(obj.hasOwnProperty(key))
					return false;
	}
	return true;
}

function apiProcessResult(res, next, err, info) {
	if (err) {
		next(err);
	} else {
		if(process.env.NODE_ENV==='test') {
			writeOutputToConsole(err, info)
		}
		//console.log("Process", info);
		if (info.errorCode === 0) {
			if (info.data){
				res.json(info.data);
			} else {
				res.send(info.message);
			}
		} else {
			res.send(""+info.errorMsg);
		}
	}
}

const writeOutputToConsole = (err, data) => {
	if (err) {
		console.log("Error:", err);
		return;
	}
	console.log("Data: ", JSON.stringify(data));
}

const checkParams = (paramList, done) =>{
	for (let elm of paramList) {
		var checkResult =
			elm.hasOwnProperty("isNotBlank") ?
				elm.checkFunc(elm.param, elm.paramName, elm.isNotBlank) :
				elm.checkFunc(elm.param, elm.paramName);
		if (checkResult) {
			done(null, { errorCode: -1, errorMsg: checkResult });
			return false;
		}
	}
	return true;
}
exports.checkStringNotBlank = checkStringNotBlank;
exports.checkDate = checkDate;
exports.checkNumber = checkNumber;
exports.checkId = checkId;
exports.isEmpty = isEmpty;
exports.apiProcessResult=apiProcessResult;
exports.writeOutputToConsole=writeOutputToConsole;
exports.checkParams=checkParams;