// const copyObj = (dist, source) => {
//     Object.getOwnPropertyNames(source).forEach(name => {
//         Object.defineProperty(dist, name, Object.getOwnPropertyDescriptor(source, name))
//     })
//     return dist;
// }

// clear fields
const clearFields = (fields) => {
    let newFields = [], fieldNames = [];
    if (fields instanceof Array) {
        fields.map(field => {
            if (typeof field === 'string') {
                newFields.push({name: field, default: undefined, type: undefined})
                fieldNames.push(field)
            } else {
                if (field.name) {
                    newFields.push({name: field.name, default: field.default, type: field.type})
                    fieldNames.push(field.name)
                }
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
            return `/${url}`
        }
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
    if (params.constructor === Object) {
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
    options = options || {
        method: 'GET',
    }

    let {method} = options
    return new Promise((resolve, rejected) => {
        fetch(url, options).then(response => {
            if (response.status >= 200 && response.status < 300) {
                resolve(response.json())
            } else {
                rejected(response)
            }
        }).catch(rejected)
    })
}


const EM2 = (m, config = {}) => {
    if (!m || typeof m !== 'object') {
        console.error('model is invalid, did you forget to pass model object to new EM2?')
        return {}
    }
    if (!m.hasOwnProperty('name')) {
        console.warn('model needs a name, could not register to models')
    }
    
    // init config, Model methods
    m = Object.assign(m, EM2.prototype, initConfig(config))
    
    // format url, fields
    m.url = filterUrl(m.url)
    let {fields, fieldNames} = clearFields(m.fields)
    m.fields = fields
    m.fieldNames = fieldNames

    // register Model and ModelNames
    if (m.hasOwnProperty('name')) {
        EM2.models[m.name] = m
        EM2.modelNames.push(m.name)
    }
    return m
}

// init EM2
EM2.models = {}
EM2.modelNames = []

// remove register
EM2.drop = (name) => {
    delete EM2.models[name]
    let modelNames = EM2.modelNames
    return modelNames.splice(modelNames.indexOf(name), 1)
}


EM2.prototype = {
    pkey: '_id',
    findOne(id) {
        return 'find one' 
    },

    find(params) {
        return fetchApi(`${this.url}${serialize(params)}`)
    },

    update(id, params) {
        return 'update'
    },
    
    create(params) {
        return 'create'
    },

    save(params) {
        return 'save'
    },

    destroy(params) {
        return 'destroy'
    }
}

export default EM2