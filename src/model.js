require('es6-promise').polyfill();
require('isomorphic-fetch');
const RSVP = require('rsvp');

const METHODS = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']

const trimFieldSlot = (item) => {
    let newItem = { type: item.type, default: item.default }
    if (item.hasOwnProperty('type') && item.type) {
        if ([undefined, null].indexOf(item.default) !== -1 || item.default.constructor !== item.type) {
            newItem.default = item.type.call(null);
        }
    }
    return newItem
}

const pushFieldNames = (fieldNames, name) => {
    let names = fieldNames.slice(0)
    if (names.indexOf(name) === -1) names.push(name)
    return names
}

// clear fields
const clearFields = (fields) => {
    let newFields = {}
    let fieldNames = []

    if (!fields) return { fields: newFields, fieldNames } 

    if (fields.constructor === Array) {
        fields.map(field => {
            if (field.constructor === String) {
                newFields[field] = trimFieldSlot(field)
                fieldNames = pushFieldNames(fieldNames, field)
            } else if (field.constructor === Object && field.hasOwnProperty('name')){
                let name = field.name
                newFields[name] = trimFieldSlot(field)
                fieldNames = pushFieldNames(fieldNames, name)
            }
        })
    } else if(fields.constructor === Object) {
        Object.keys(fields).map(name => {
            if (fields.hasOwnProperty(name)) {
                newFields[name] = trimFieldSlot(fields[name])
                fieldNames = pushFieldNames(fieldNames, name)
            }
        })
    }

    return { fields: newFields, fieldNames }
}

// filter url 
const filterUrl = (url) => {
    if (typeof url !== 'string') url = '';
    // start with '/', but not http or https
    if (url.charAt(0) !== '/') {
        if (url.indexOf('http') !== 0 && url.indexOf('https') !== 0) {
            url = `/${url}`
        }
    }
    
    // if last is '/', remove it!
    let _len = url.length - 1;
    if(_len > 0 && url.charAt(_len) === '/')  url = url.slice(0, _len)

    return url
}

// init config, temporarily set primary key
const initConfig = (config) => {
    let _config = {}
    if (config) {
        let {pkey, parseData, exception} = config
        if (typeof pkey === 'string' && pkey) {
            _config.pkey = pkey.trim()
        }
        if (typeof parseData === 'function') {
            _config.parseData = parseData
        }

        if (typeof exception === 'function') {
            _config.exception = exception
        }
    }
    return _config
}

// extend
const extend = function(Child, Parent) {
    Child.prototype = new Parent()
    Child.prototype.constructor = Child
    return Child
}


// main
const em2 = (initObj, config = {}) => {
    if (initObj === undefined || initObj === null || initObj.constructor !== Object) {
        console.error('model is invalid, model should be an object')
        return {}
    }

    if (!initObj.hasOwnProperty('name')) {
        console.error('model needs a name, could not register to model manager')
        return
    }
    
    // init config, Model methods
    let _extendModel = extend(function(){}, Model)
    let _model = Object.assign(new _extendModel(), initConfig(config))

    // format url, fields
    _model.url = filterUrl(initObj.url)
    let {fields, fieldNames} = clearFields(initObj.fields)
    _model.fields = fields
    _model.fieldNames = fieldNames

    return _model
}

// reslove Data api
const fetchData = function(url, params = {}){
    params = params || {}
    let headers = params.headers || {}
    if (!params.hasOwnProperty('method')) {
        params.method = 'GET'
    }
    if (!headers['Content-Type']) {
        headers['Content-Type'] =  'application/x-www-form-urlencoded;charset=UTF-8'
    }
    if (!headers['X-Requested-With']) {
        headers['X-Requested-With'] = 'XMLHttpRequest'
    }
    if (!params.credentials) {
        params.credentials = 'same-origin'
    }
    params.headers = headers

    return new RSVP.Promise((resolve, reject) => {
        return fetch(url, params).then(response => {
            response.status >= 200 && response.status < 300 ?  resolve(response.json()) : reject(response)
        }).catch(reject)
    })
}

const Model = function(){
    // pkey, url
    this.pkey =  '_id'
    this.url = '/'
    // parse

    const nested = function(){ return this.url.indexOf(':') !== -1}
    // serialize params object to ?a=1&b=2
    const serialize = (params) => {
        if (params && params.constructor === Object) {
            if (Object.getOwnPropertyNames(params).length === 0) {
                return ''
            }
            return Object.keys(params).reduce((prev, current, index) => {
                if ([undefined, null].indexOf(params[current]) !== -1) {
                    return prev
                }
                if (prev.slice(-1) === '?') {
                    return `${prev}${current}=${params[current]}`
                }
                return `${prev}&${current}=${params[current]}`
            }, '?')
        }
        return ''
    }

    // res injection
    const resInject = function(pms){
        let that = this || Model
        let {parseData, exception} = that

        const errFunc = (error) => {
            if (typeof exception === 'function') {
                throw exception.call(this, error)
            }
            throw error
        }

        if (typeof parseData === 'function') {
            return pms.then(data => {
                console.log('this', this)
                return parseData.call(this, data)
            }).catch(errFunc)
        }

        return pms.catch(errFunc)
    }

    // nested url and params seperate
    const filterNestedParams = function(obj){
        if ([undefined, null].indexOf(obj) !== -1) {
            throw('参数错误')
        }
        let s_url = Object.keys(obj).reduce((prev, name) => {
            if (obj.hasOwnProperty(name)) {
                let reg = new RegExp('/:' + name, 'gi')
                if (prev.match(reg)) {
                    let val = obj[name]
                    delete obj[name]
                    return prev.replace(reg, '/' + val)
                }
            }
            return prev
        }, this.url)

        return {
            s_url,
            s_params: obj
        }
    }
    
    // request dispatch
    const reqDispatch = function(method = 'OPTIONS', url = '', params = {}){
        method = method.toUpperCase()
        if (METHODS.indexOf(method) === -1) method = 'OPTIONS'
        if (['HEAD', 'GET'].indexOf(method) !== -1) {
            return resInject.call(this, fetchData(`${url}${serialize.call(this, params)}`))
        }
        if (method === 'DELETE') {
            return resInject.call(this, fetchData(`${url}${serialize.call(this, params)}`, {method: 'DELETE'})) 
        }

        params = Object.assign({method}, {body: serialize.call(this, params).slice(1)})
        return resInject.call(this, fetchData(url, params))
    }

    this.trimParams = function(params){
        let {fields} = this;
        Object.keys(fields).forEach(name => {
            let format = fields[name]
            if (params.hasOwnProperty(name)) {
                let value = params[name]
                let hasVal = [undefined, null].indexOf(value) === -1
                // field has no type, and params's field has no value, remove key
                if (!format.type && !hasVal) delete params[name]
                // field has type, and params's field has no value or value type wrong, filled with default
                if (format.type && (!hasVal || value.constructor !== format.type)) {
                    params[name] = hasVal ? format.default : format.type.call(null)
                }

            } else {
                if (format.type) {
                    if ([undefined, null].indexOf(format.default) !== -1 || format.default.constructor !== format.type) {
                        params[name] = format.type.call(null)
                    } else {
                        params[name] = format.default
                    }
                }
            }
        })
        return params
    }

    this.findOne = function(_id, params = {}) {
        // nested model
        if (nested.call(this)) {
            if (_id && _id.constructor === Object) {
                let {s_url} = filterNestedParams.call(this, _id)
                let pkey = _id[this.pkey]
                delete _id[this.pkey]
                return reqDispatch.call(this, 'GET', `${s_url}/${pkey}`, params)
            }
            throw(`wrong params, first argument should be an object, and has property in model's url(just like :id) and ${this.pkey}`)
        }

        // basic
        if (_id && _id.constructor === Object) {
            let pkey = _id[this.pkey]
            delete _id[this.pkey]
            return reqDispatch.call(this, 'GET', `${this.url}/${pkey}`, _id)
        }

        return reqDispatch.call(this, 'GET', `${this.url}/${_id}`, params)
    },

    this.find = function(params) {
        // nested
        if (nested.call(this)) {
            let {s_url, s_params} = filterNestedParams.call(this, params)
            delete s_params[this.pkey]
            return reqDispatch.call(this, 'GET', s_url, s_params)
        }
        // basic
        return reqDispatch.call(this, 'GET', this.url, params)
    },

    this.update = function(params) {
        let _id = params[this.pkey]
        delete params[this.pkey]

        if (nested.call(this)) {
            let {s_url, s_params} = filterNestedParams.call(this, params)
            return reqDispatch.call(this, 'PUT', `${s_url}/${_id}`, this.trimParams.call(this, s_params))
        }
        return reqDispatch.call(this, 'PUT', `${this.url}/${_id}`, this.trimParams.call(this, params))
    },
    
    this.create = function(params) {
        delete params[this.pkey]
        if (nested.call(this)) {
            let {s_url, s_params} = filterNestedParams.call(this, params)
            return reqDispatch.call(this, 'POST', s_url, this.trimParams.call(this, s_params))
        }
        return reqDispatch.call(this, 'POST', this.url, this.trimParams.call(this, params))
    }

    this.save = function(params){
        return params && params[this.pkey] ? this.update(params) : this.create(params)
    }

    this.destroy = function(params) {
        let _id = params[this.pkey]
        delete params[this.pkey]

        if (nested.call(this)) {
            let {s_url, s_params} = filterNestedParams.call(this, params)
            return reqDispatch.call(this, 'DELETE', `${s_url}/${_id}`, s_params)
        }
        return reqDispatch.call(this, 'DELETE', `${this.url}/${_id}`, params)
    }

    this.request = function(method, url, params) {
        if (arguments.length < 2 || typeof method !== 'string' || typeof url !== 'string') {
            return console.error('params wrong, need three arguments: method, url, params(optional query and fetch setting)')
        }

        return reqDispatch.call(this, method, url, params)
    }

}

module.exports = em2
