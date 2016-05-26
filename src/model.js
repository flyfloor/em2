require('whatwg-fetch')
require('es6-promise').polyfill();

const trimFieldSlot = (item) => {
    let newItem = { type: item.type, default: item.default }
    if (item.hasOwnProperty('type') &&  [undefined, null].indexOf(item.type) === -1) {
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
    let _l = url.length - 1;
    if(_l > 0 && url.charAt(_l) === '/')  url = url.slice(0, _l)

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

// serialize params object to ?a=1&b=2
const serialize = (params) => {
    if (params && params.constructor === Object) {
        if (Object.getOwnPropertyNames(params).length === 0) {
            return ''
        }
        return Object.keys(params).reduce((prev, current, index) => {
            if (index === 0) {
                return `${prev}${current}=${params[current]}`
            }
            return `${prev}&${current}=${params[current]}`
        }, '?')
    }
    return ''
}

// fetching api
const resolveData = function(url, params = {}){
    params = params || {};
    let headers = params.headers || {}

    if (!params.hasOwnProperty('method')) {
        params.method = 'GET';
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

    return new Promise((resolve, rejected) => {
        fetch(url, params).then(response => {
            response.status >= 200 && response.status < 300 ?  resolve(response.json()) : rejected(response)
        }).catch(rejected)
    })
}

// main
const em2 = (model, config = {}) => {
    if (model === undefined || model === null || model.constructor !== Object) {
        console.error('model is invalid, did you forget to pass model object')
        return {}
    }

    if (!model.hasOwnProperty('name')) {
        console.warn('model needs a name, could not register to model manager')
    }
    
    // init config, Model methods
    model = Object.assign({fieldNames: null}, model, em2.prototype, initConfig(config))
    
    // format url, fields
    model.url = filterUrl(model.url)
    let {fields, fieldNames} = clearFields(model.fields)
    model.fields = fields
    model.fieldNames = fieldNames

    // register Model and ModelNames
    if (model.hasOwnProperty('name')) {
        em2.models[model.name] = model
        em2.modelNames.push(model.name)
    }
    return model
}

// init em2 model, modelNames
em2.models = {}
em2.modelNames = []

// trim params by model's fields
em2.trimParams = (modelName, params) => {
    let model = em2.models[modelName]
    if (!model) {
        console.warn('Model is not defined')
        return params
    }

    let {fields} = model;
    Object.keys(fields).forEach(name => {
        let format = fields[name]
        if (params.hasOwnProperty(name)) {
            let value = params[name]
            let hasType = [undefined, null].indexOf(format.type) === -1
            let hasVal = [undefined, null].indexOf(value) === -1
            
            // field has no type, and params's field has no value, remove key
            if (!hasType && !hasVal) delete params[name]
            
            // field has type, and params's field has no value or value type wrong, filled with default
            if (hasType && (!hasVal || value.constructor !== format.type)) {
                let hasDefault = [undefined, null].indexOf(value) === -1
                params[name] = hasDefault ? format.default : format.type.call(null)
            }

        } else {
            if (format.type) params[name] = format.type.call(null)
        }
    })
    return params
}

// remove register
em2.drop = (name) => {
    delete em2.models[name]
    let {modelNames} = em2
    return modelNames.splice(modelNames.indexOf(name), 1)
}

const injection = function(handler){
    let that = this || {}
    let {parseData, exception} = that
    if (typeof parseData === 'function') {
        return handler.then(data => {
            return parseData.call(this, data) 
        }).catch(error => {
            if (typeof exception === 'function') {
                return exception.call(this, error)
            }
            return error
        })
    }
    return handler.catch(error => {
        if (typeof exception === 'function') {
            return exception.call(this, error)
        }
        return error
    })
}

em2.prototype = {
    pkey: '_id',
    findOne(_id, params) {
        let handler = null;
        if ([undefined, null].indexOf(_id) === -1 && _id.constructor === Object) {
            handler = resolveData(`${this.url}/${_id[this.pkey]}${serialize(params)}`)
        } else {
            handler = resolveData(`${this.url}/${_id}${serialize(params)}`)
        }
        return injection.call(this, handler, { parseData, exception })
    },

    find(params) {
        return injection.call(this, resolveData(`${this.url}${serialize(params)}`), { parseData, exception })
    },

    update(params) {
        let _id = params[this.pkey]
        delete params[this.pkey]

        let options = em2.trimParams(this.name, params)
        options = Object.assign({method: 'PUT'}, {body: serialize(options).slice(1)})

        return injection.call(this, resolveData(`${this.url}/${_id}`, options))
    },
    
    create(params) {
        delete params[this.pkey]
        let options = em2.trimParams(this.name, params)
        options = Object.assign({method: 'POST'}, {body: serialize(options).slice(1)})

        return injection.call(this, resolveData(`${this.url}`, options))
    },

    save(params) {
        return params && params[this.pkey] ? this.update(params) : this.create(params)
    },

    destroy(params) {
        let _id = params[this.pkey]
        delete params[this.pkey]

        return injection.call(this, resolveData(`${this.url}/${_id}${serialize(params)}`, {method: 'DELETE'}))
    },
    request: {
        get(url, params){
            return injection.call(this, resolveData(`${url}${serialize(params)}`))
        },
        post(url, params){
            params = Object.assign({method: 'POST'}, {body: serialize(params).slice(1)})
            return injection.call(this, resolveData(url, params))
        },
        put(url, params){
            params = Object.assign({method: 'PUT'}, {body: serialize(params).slice(1)})
            return injection.call(this, resolveData(url, params))
        },
        delete(url, params){
            return injection.call(this, resolveData(`${url}${serialize(params)}`, {method: 'DELETE'}))
        }
    }
}

module.exports = em2
