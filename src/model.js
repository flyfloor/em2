// const copyObj = (dist, source) => {
//     Object.getOwnPropertyNames(source).forEach(name => {
//         Object.defineProperty(dist, name, Object.getOwnPropertyDescriptor(source, name))
//     })
//     return dist;
// }

const trimFieldSlot = (item) => {
    let newItem = {
        type: item.type,
        default: item.default
    }
    if (item.hasOwnProperty('type') &&  [undefined, null].indexOf(item.type) === -1) {
        if ([undefined, null].indexOf(item.default) !== -1 || item.default.constructor !== item.type) {
            newItem.default = item.type.call(null);
        }
    }

    return newItem
}

const pushFieldNames = (fieldNames, name) => {
    let names = fieldNames.slice(0)
    if (names.indexOf(name) === -1) {
        names.push(name)
    }
    return names
}

// clear fields
const clearFields = (fields) => {
    let newFields = {}
    let fieldNames = []

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

    return {
        fields: newFields,
        fieldNames
    }
}

// filter url 
const filterUrl = (url) => {
    if (typeof url !== 'string') url = '';

    if (url.charAt(0) !== '/') {
        if (url.indexOf('http') !== 0 && url.indexOf('https') !== 0) {
            url = `/${url}`
        }
    }

    let _l = url.length - 1;
    if(_l > 0 && url.charAt(_l) === '/') {
        url = url.slice(0, _l)
    }

    return url
}

// init config
const initConfig = (config) => {
    let _config = {}
    if (config) {
        let {pkey} = config
        if (typeof pkey === 'string' && pkey !== '') {
            _config.pkey = pkey
        }
    }
    return _config
}

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

const fetchApi = (url, options = {}) => {
    options = options || {};

    if (!options.hasOwnProperty('method')) {
        options.method = 'GET';
    }
    return new Promise((resolve, rejected) => {
        fetch(url, options).then(response => {
            response.status >= 200 && response.status < 300 ?  resolve(response.json()) : rejected(response)
        }).catch(rejected)
    })
}


const EM2 = (model, config = {}) => {
    if (model === undefined || model === null || model.constructor !== Object) {
        console.error('model is invalid, did you forget to pass model object')
        return {}
    }

    if (!model.hasOwnProperty('name')) {
        console.warn('model needs a name, could not register to model manager')
    }
    
    // init config, Model methods
    model = Object.assign({fieldNames: null}, model, EM2.prototype, initConfig(config))
    
    // format url, fields
    model.url = filterUrl(model.url)
    let {fields, fieldNames} = clearFields(model.fields)
    model.fields = fields
    model.fieldNames = fieldNames

    // register Model and ModelNames
    if (model.hasOwnProperty('name')) {
        EM2.models[model.name] = model
        EM2.modelNames.push(model.name)
    }
    return model
}

// init EM2
EM2.models = {}
EM2.modelNames = []

EM2.trimParams = (modelName, params) => {
    /* field pedding */
    let model = EM2.models[modelName]
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
            if (!hasType && !hasVal) {
                delete params[name]
            }
            
            // field has type, and params's field has no value or value type wrong, filled with default
            if (hasType && (!hasVal || value.constructor !== format.type)) {
                let hasDefault = [undefined, null].indexOf(value) === -1
                params[name] = hasDefault ? format.default : format.type.call(null)
            }

        } else if (format.type) {
            params[name] = format.type.call(null)
        }
    })
    return params
}

// remove register
EM2.drop = (name) => {
    delete EM2.models[name]
    let {modelNames} = EM2
    return modelNames.splice(modelNames.indexOf(name), 1)
}


EM2.prototype = {
    pkey: '_id',
    findOne(_id, params) {
        if ([undefined, null].indexOf(_id) === -1 && _id.constructor === Object) {
            return fetchApi(`${this.url}/${_id[this.pkey]}${serialize(params)}`) 
        }
        return fetchApi(`${this.url}/${_id}${serialize(params)}`)
    },

    find(params) {
        return fetchApi(`${this.url}${serialize(params)}`)
    },

    update(params) {
        let _id = params[this.pkey]
        delete params[this.pkey]
        let options = EM2.trimParams(this.name, params)
        options = Object.assign({method: 'PUT'}, {body: JSON.stringify(options)})
        return fetchApi(`${this.url}/${_id}`, options)
    },
    
    create(params) {
        delete params[this.pkey]
        let options = EM2.trimParams(this.name, params)
        options = Object.assign({method: 'POST'}, {body: JSON.stringify(params)})
        return fetchApi(`${this.url}`, options)
    },

    save(params) {
        return params && params[this.pkey] ? this.update(params) : this.create(params)
    },

    destroy(params) {
        let _id = params[this.pkey]
        delete params[this.pkey]
        return fetchApi(`${this.url}/${_id}${serialize(params)}`, {method: 'DELETE'})
    }
}

module.exports = EM2
