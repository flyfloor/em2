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
    if (typeof url !== 'string') {
        url = ''
    }

    if (url.charAt(0) !== '/') {
        if (url.indexOf('http') !== 0 && url.indexOf('https') !== 0) {
            return `/${url}`
        }
    }
    return url
}

// init config
const initConfig = (config) => {
    if (!config) {
        return {}
    }
    let {pkey} = config
    let _config = {}
    if (typeof pkey === 'string' && pkey !== '') {
        _config.pkey = pkey
    }
    return _config
}

const EM2 = (m, config = {}) => {
    if (!m || typeof m !== 'object') {
        console.error('model is invalid, did you forget to pass model object to new EM2?')
        return {}
    }
    if (!m.hasOwnProperty('name')) {
        console.warn('model needs a name, could not register to models')
    }

    m = Object.assign(m, EM2.prototype, initConfig(config))
    m.url = filterUrl(m.url)
    let {fields, fieldNames} = clearFields(m.fields)
    m.fields = fields
    m.fieldNames = fieldNames
    if (m.hasOwnProperty('name')) {
        EM2.models[m.name] = m
        EM2.modelNames.push(m.name)
    }
    return m
}

EM2.models = {}
EM2.modelNames = []

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
        return 'find all'
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